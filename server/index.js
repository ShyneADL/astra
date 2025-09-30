import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import {
  therapistRAGChat,
  shouldUseFastMode,
  getFastResponse,
} from "./lib/therapist-rag.js";
import { initializeVectorDB } from "./lib/vector-db.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Initialize vector database on startup
initializeVectorDB().then((success) => {
  if (success) {
    console.log("✅ Therapy knowledge base initialized successfully");
  } else {
    console.log("❌ Failed to initialize therapy knowledge base");
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

// Middleware
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:5174",
      "https://astra-smoky.vercel.app",
      "https://astra-git-main-shyneadls-projects.vercel.app",
      "https://astra-ljjq49s7z-shyneadls-projects.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    db: {
      schema: "public",
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, conversationId, wantTitle, message } = req.body;
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    const token = authHeader.split(" ")[1];

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    // Validate messages array
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res
        .status(400)
        .json({ error: "Messages array is required and cannot be empty" });
    }

    const userMessage = messages[messages.length - 1];
    if (!userMessage || !userMessage.content) {
      return res.status(400).json({ error: "Invalid message structure" });
    }

    let sessionId = conversationId;
    let generatedTitle = null;

    // Parallel operations for better performance
    const [sessionResult, titleResult] = await Promise.allSettled([
      // Session handling
      (async () => {
        if (!sessionId) {
          const { data: session, error: sessionError } = await supabase
            .from("chat_sessions")
            .insert({
              user_id: user.id,
            })
            .select()
            .single();

          if (sessionError || !session?.id) {
            throw new Error("Failed to create chat session");
          }
          return session.id;
        } else {
          const { data: existingSession, error: sessionCheckError } =
            await supabase
              .from("chat_sessions")
              .select("id, user_id")
              .eq("id", sessionId)
              .eq("user_id", user.id)
              .single();

          if (sessionCheckError || !existingSession) {
            throw new Error("Invalid conversation ID");
          }
          return sessionId;
        }
      })(),
      // Title generation (only if needed and in parallel)
      wantTitle && message
        ? (async () => {
            try {
              const titleModel = genAI.getGenerativeModel({
                model: "gemini-2.5-flash",
              });
              const titlePrompt = [
                "Summarize the following user message into a very short, human-readable chat title:",
                "- Max 8 words",
                "- No surrounding quotes",
                "- No trailing punctuation",
                "",
                `Message: """${message}"""`,
                "",
                "Title:",
              ].join("\n");

              const titleResult = await titleModel.generateContent(titlePrompt);
              const titleText = titleResult.response.text();
              return titleText
                .trim()
                .replace(/^["'#*\-–\s]+|["'#*\-–\s]+$/g, "")
                .slice(0, 80);
            } catch (titleError) {
              console.error("Title generation error:", titleError);
              return null;
            }
          })()
        : Promise.resolve(null),
    ]);

    if (sessionResult.status === "rejected") {
      return res.status(500).json({ error: sessionResult.reason.message });
    }

    sessionId = sessionResult.value;
    generatedTitle =
      titleResult.status === "fulfilled" ? titleResult.value : null;

    // Start streaming response immediately
    res.setHeader("Content-Type", "text/plain");
    res.setHeader(
      "Access-Control-Expose-Headers",
      "X-Conversation-Id, X-Generated-Title, X-Off-Topic"
    );
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("X-Conversation-Id", sessionId);
    if (generatedTitle) {
      res.setHeader("X-Generated-Title", generatedTitle);
    }

    // Check for fast mode first
    const fastResponse = shouldUseFastMode(userMessage.content)
      ? getFastResponse(userMessage.content)
      : null;

    if (fastResponse) {
      // Fast mode - immediate response without RAG or AI processing
      res.write(fastResponse);
      res.end();

      // Save messages asynchronously
      setImmediate(async () => {
        try {
          await supabase.from("chat_messages").insert({
            session_id: sessionId,
            user_id: user.id,
            role: "user",
            content: userMessage.content,
          });

          await supabase.from("chat_messages").insert({
            session_id: sessionId,
            user_id: user.id,
            role: "assistant",
            content: fastResponse,
          });

          if (generatedTitle) {
            await supabase
              .from("chat_sessions")
              .update({ title: generatedTitle })
              .eq("id", sessionId);
          }
        } catch (error) {
          console.error("Fast mode save error:", error);
        }
      });

      return;
    }

    // Save user message and get history in parallel with RAG processing
    const [saveUserMsg, chatHistory, ragResult] = await Promise.allSettled([
      supabase.from("chat_messages").insert({
        session_id: sessionId,
        user_id: user.id,
        role: "user",
        content: userMessage.content,
      }),
      supabase
        .from("chat_messages")
        .select("role, content")
        .eq("session_id", sessionId)
        .order("created_at", { ascending: true }),
      therapistRAGChat(userMessage.content, []), // Start with empty history for speed
    ]);

    // Handle any errors from parallel operations
    if (saveUserMsg.status === "rejected") {
      console.error("User message save error:", saveUserMsg.reason);
    }

    if (chatHistory.status === "rejected") {
      console.error("History fetch error:", chatHistory.reason);
    }

    const history =
      chatHistory.status === "fulfilled" ? chatHistory.value.data : [];
    const rag =
      ragResult.status === "fulfilled"
        ? ragResult.value
        : {
            prompt: `You are a compassionate AI therapist focused on mental health and wellbeing. Respond with empathy and focus on mental health support.`,
            isOffTopic: false,
            relevantKnowledge: [],
          };

    if (rag.isOffTopic) {
      res.setHeader("X-Off-Topic", "true");
    }

    // Optimized model configuration for faster responses
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      generationConfig: {
        temperature: 0.7,
        topK: 20, // Reduced for faster generation
        topP: 0.9, // Reduced for faster generation
        maxOutputTokens: 300, // Reduced for faster responses
      },
      systemInstruction: {
        role: "system",
        parts: [{ text: rag.prompt }],
      },
    });

    // Build history for Gemini (excluding the current user message)
    const geminiHistory = history.slice(0, -1).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const chat = model.startChat({
      history: geminiHistory,
    });

    // Start streaming immediately
    const result = await chat.sendMessageStream(userMessage.content);
    let fullResponse = "";

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      console.log("Server streaming chunk:", chunkText); // Debug log
      fullResponse += chunkText;
      res.write(chunkText);
    }

    // Save assistant response asynchronously (don't block response)
    setImmediate(async () => {
      try {
        await supabase.from("chat_messages").insert({
          session_id: sessionId,
          user_id: user.id,
          role: "assistant",
          content: fullResponse,
        });

        // Update title if generated
        if (generatedTitle) {
          await supabase
            .from("chat_sessions")
            .update({ title: generatedTitle })
            .eq("id", sessionId);
        }
      } catch (error) {
        console.error("Async save error:", error);
      }
    });

    res.end();
  } catch (error) {
    console.error("Server error:", error);
    res
      .status(500)
      .json({ error: "Internal server error", details: error.message });
  }
});

app.get("/api/health", (req, res) => {
  res.status(200).send("OK");
});

app.get("/api/chat", (req, res) => {
  res.status(405).send("Use POST /api/chat");
});

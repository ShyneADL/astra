import express from "express";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const port = 3001;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:5173", "https://astra-t1pe.onrender.com"],
    credentials: true,
  })
);
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post("/api/chat", async (req, res) => {
  try {
    const { messages, conversationId, wantTitle, message } = req.body;
    const authHeader = req.headers.authorization;

    console.log("Received request body:", JSON.stringify(req.body, null, 2));

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No authorization token provided" });
    }

    const token = authHeader.split(" ")[1];

    let user;
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser(token);

      if (authError) {
        console.error("Auth error:", authError);
        return res.status(401).json({ error: "Invalid token" });
      }

      if (!authUser) {
        return res.status(401).json({ error: "No user found" });
      }

      user = authUser;
    } catch (error) {
      console.error("Network error during auth:", error);
      return res.status(503).json({ error: "Authentication service unavailable" });
    }

    let generatedTitle = null;
    if (wantTitle && message) {
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
        generatedTitle = titleText
          .trim()
          .replace(/^["'#*\-–\s]+|["'#*\-–\s]+$/g, "")
          .slice(0, 80);
      } catch (titleError) {
        console.error("Title generation error:", titleError);
        // Continue without title if generation fails
        generatedTitle = "New Chat";
      }
    }

    let sessionId = conversationId;

    if (!sessionId) {
      try {
        const { data: session, error: sessionError } = await supabase
          .from("chat_sessions")
          .insert({
            user_id: user.id,
          })
          .select()
          .single();

        if (sessionError) {
          console.error("Session creation error:", sessionError);
          return res.status(500).json({ error: "Failed to create chat session" });
        }

        sessionId = session.id;

        if (generatedTitle) {
          const { error: updateError } = await supabase
            .from("chat_sessions")
            .update({ title: generatedTitle })
            .eq("id", sessionId);

          if (updateError) {
            console.error("Title update error:", updateError);
          }
        }
      } catch (error) {
        console.error("Network error during session creation:", error);
        return res.status(503).json({ error: "Database service unavailable" });
      }
    }

    // Validate messages array and get the last user message
    if (!messages || messages.length === 0) {
      console.error("No messages provided in request");
      return res.status(400).json({ error: "No messages provided" });
    }

    console.log("Messages received:", JSON.stringify(messages, null, 2));

    const userMessage = messages[messages.length - 1];
    
    if (!userMessage) {
      console.error("No user message found");
      return res.status(400).json({ error: "No user message found" });
    }

    // Handle both content and parts format for compatibility
    const messageContent = userMessage.content || (userMessage.parts && userMessage.parts[0]?.text) || message;
    
    if (!messageContent) {
      console.error("No message content found:", { userMessage, message });
      return res.status(400).json({ error: "No message content found" });
    }

    const { error: userMsgError } = await supabase
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        user_id: user.id,
        role: "user",
        content: messageContent,
      });

    if (userMsgError) {
      console.error("User message save error:", userMsgError);
      return res.status(500).json({ error: "Failed to save user message" });
    }

    // Prepare conversation history for Gemini
    const { data: chatHistory, error: historyError } = await supabase
      .from("chat_messages")
      .select("role, content")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });

    if (historyError) {
      console.error("History fetch error:", historyError);
      return res.status(500).json({ error: "Failed to fetch chat history" });
    }

    const geminiHistory = chatHistory.slice(0, -1).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }],
    }));

    const systemPrompt =
      "You are a compassionate and professional AI therapist. Your role is to provide emotional support, active listening, and helpful guidance to users seeking mental health assistance. Always maintain a warm, empathetic, and non-judgmental tone. Focus on understanding the user's feelings and providing constructive responses that promote mental well-being.";

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: systemPrompt,
    });

    const chat = model.startChat({
      history: geminiHistory,
    });

    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("X-Conversation-Id", sessionId);

    if (generatedTitle) {
      res.setHeader("X-Generated-Title", generatedTitle);
    }

    const result = await chat.sendMessageStream(messageContent);

    let aiResponse = "";
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      aiResponse += chunkText;
      res.write(chunkText);
    }

    const { error: aiMsgError } = await supabase.from("chat_messages").insert({
      session_id: sessionId,
      user_id: user.id,
      role: "assistant",
      content: aiResponse,
    });

    if (aiMsgError) {
      console.error("AI message save error:", aiMsgError);
    }

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
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

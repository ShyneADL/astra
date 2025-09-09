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

    console.log("Received request body:", JSON.stringify(req.body, null, 2)); // Debug log

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
      }
    }

    let sessionId = conversationId;

    if (!sessionId) {
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

      sessionId = conversationId;

      if (generatedTitle) {
        const { error: updateError } = await supabase
          .from("chat_sessions")
          .update({ title: generatedTitle })
          .eq("id", sessionId);

        if (updateError) {
          console.error("Title update error:", updateError);
        }
      }
    } else {
      const { data: existingSession, error: sessionCheckError } = await supabase
        .from("chat_sessions")
        .select("id, user_id")
        .eq("id", sessionId)
        .eq("user_id", user.id)
        .single();

      if (sessionCheckError || !existingSession) {
        console.error("Session validation error:", sessionCheckError);
        return res.status(400).json({ error: "Invalid conversation ID" });
      }
    }

    const userMessage = messages[messages.length - 1];

    // Validate userMessage structure
    if (!userMessage || !userMessage.content) {
      return res.status(400).json({ error: "Invalid message structure" });
    }

    console.log("Processing user message:", userMessage); // Debug log

    const { error: userMsgError } = await supabase
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        user_id: user.id,
        role: "user",
        content: userMessage.content,
      });

    if (userMsgError) {
      console.error("User message save error:", userMsgError);
      return res.status(500).json({ error: "Failed to save user message" });
    }

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

    const systemPrompt = process.env.SYSTEM_PROMPT;
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: {
        role: "system",
        parts: [{ text: systemPrompt }],
      },
    });

    const chat = model.startChat({
      history: geminiHistory,
    });

    // Set up streaming response
    res.setHeader("Content-Type", "text/plain");
    res.setHeader("Transfer-Encoding", "chunked");
    res.setHeader("X-Conversation-Id", sessionId);
    if (generatedTitle) {
      res.setHeader("X-Generated-Title", generatedTitle);
    }

    // Send message and stream response
    console.log("Sending message to Gemini:", userMessage.content); // Debug log
    const result = await chat.sendMessageStream(userMessage.content);

    let fullResponse = "";

    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullResponse += chunkText;
      res.write(chunkText);
    }

    // Save assistant response to database
    const { error: assistantMsgError } = await supabase
      .from("chat_messages")
      .insert({
        session_id: sessionId,
        user_id: user.id,
        role: "assistant",
        content: fullResponse,
      });

    if (assistantMsgError) {
      console.error("Assistant message save error:", assistantMsgError);
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

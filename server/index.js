import express from 'express';
import cors from 'cors';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const app = express();
const port = 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/chat', async (req, res) => {
  try {
    const { messages, conversationId } = req.body;
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No authorization token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify the user with Supabase
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    let sessionId = conversationId;
    
    // Create new chat session if none provided
    if (!sessionId) {
      const { data: session, error: sessionError } = await supabase
        .from('chat_sessions')
        .insert({ 
          user_id: user.id, 
          title: 'New Chat' 
        })
        .select()
        .single();
        
      if (sessionError) {
        console.error('Session creation error:', sessionError);
        return res.status(500).json({ error: 'Failed to create chat session' });
      }
      
      sessionId = session.id;
    }
    
    // Get the user's message (last message in the array)
    const userMessage = messages[messages.length - 1];
    
    // Save user message to database
    const { error: userMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'user',
        content: userMessage.content
      });
      
    if (userMsgError) {
      console.error('User message save error:', userMsgError);
      return res.status(500).json({ error: 'Failed to save user message' });
    }
    
    // Prepare conversation history for Gemini
    const { data: chatHistory, error: historyError } = await supabase
      .from('chat_messages')
      .select('role, content')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
      
    if (historyError) {
      console.error('History fetch error:', historyError);
      return res.status(500).json({ error: 'Failed to fetch chat history' });
    }
    
    // Convert to Gemini format (role mapping: 'user' -> 'user', 'assistant' -> 'model')
    const geminiHistory = chatHistory.slice(0, -1).map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
    
    // Add therapist instruction
    const therapistInstruction = `You are a compassionate and professional AI therapist. Your role is to provide emotional support, active listening, and helpful guidance to users seeking mental health assistance. Always maintain a warm, empathetic, and non-judgmental tone. Focus on understanding the user's feelings and providing constructive responses that promote mental well-being.`;
    
    // Initialize Gemini model
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    
    // Start chat with history
    const chat = model.startChat({
      history: geminiHistory,
      systemInstruction: therapistInstruction
    });
    
    // Set up streaming response
    res.setHeader('Content-Type', 'text/plain');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('X-Conversation-Id', sessionId);
    
    // Send message and stream response
    const result = await chat.sendMessageStream(userMessage.content);
    
    let fullResponse = '';
    
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullResponse += chunkText;
      res.write(chunkText);
    }
    
    // Save assistant response to database
    const { error: assistantMsgError } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        user_id: user.id,
        role: 'assistant',
        content: fullResponse
      });
      
    if (assistantMsgError) {
      console.error('Assistant message save error:', assistantMsgError);
    }
    
    res.end();
    
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});

import { supabase } from "./supabase";

// Save a chat message
export const saveChatMessage = async (sessionId, role, content) => {
  const { data, error } = await supabase.from("chat_messages").insert({
    session_id: sessionId,
    user_id: (await supabase.auth.getUser()).data.user?.id,
    role,
    content,
  });

  if (error) throw error;
  return data;
};

// Get chat messages for a session
export const getChatMessages = async (sessionId) => {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
};

// Create a new chat session
export const createChatSession = async (title = "New Chat") => {
  const { data, error } = await supabase
    .from("chat_sessions")
    .insert({
      user_id: (await supabase.auth.getUser()).data.user?.id,
      title,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
};

// Get user's chat sessions
export const getUserChatSessions = async () => {
  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data;
};

import { supabase } from "./supabase";

// Save a chat message
export const saveChatMessage = async (
  sessionId: string,
  role: string,
  content: string
) => {
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
export const getChatMessages = async (sessionId: string) => {
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

export const getChatSessionByTitle = async (title: string) => {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("title", title)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

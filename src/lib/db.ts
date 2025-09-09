import { supabase } from "./supabase";

export const getChatMessages = async (sessionId: string) => {
  const { data, error } = await supabase
    .from("chat_messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return data;
};

export const createChatSession = async (title: string) => {
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

export const getChatSessionById = async (id: string) => {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await supabase
    .from("chat_sessions")
    .select("*")
    .eq("user_id", userId)
    .eq("id", id)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data;
};

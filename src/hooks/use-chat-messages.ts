import { useQuery } from "@tanstack/react-query";
import { getChatMessages } from "@/lib/db";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
}

export function useChatMessages({
  conversationId,
}: {
  conversationId: string | null;
}) {
  return useQuery({
    queryKey: ["chat-messages", conversationId],
    queryFn: async () => {
      if (!conversationId) return [];

      const fetchedMessages = await getChatMessages(conversationId);
      if (!fetchedMessages) return [];

      return fetchedMessages.map((msg: any) => ({
        id: String(msg.id),
        content: msg.content,
        sender: (msg.role === "assistant" ? "ai" : "user") as "user" | "ai",
        timestamp: msg.created_at,
      })) as Message[];
    },
    enabled: !!conversationId,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}

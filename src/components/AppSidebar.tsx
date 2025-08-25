import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { supabase } from "@/lib/supabase";
import { useSelectedConversation } from "@/contexts/SelectedConversationContext";

type ConversationItem = {
  id: string;
  title: string;
};

export function AppSidebar() {
  const { setSelectedId } = useSelectedConversation();
  const queryClient = useQueryClient();

  const {
    data: conversations,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["chat_sessions"],
    queryFn: async (): Promise<ConversationItem[]> => {
      const { data, error } = await supabase
        .from("chat_sessions")
        .select("id, title")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel("chat_sessions_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_sessions" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat_sessions"] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return (
    <Sidebar>
      <SidebarHeader />
      <SidebarContent>
        <SidebarGroup>
          <h3 className="text-sm font-bold text-gray-600 mb-2">
            Conversations
          </h3>
          {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
          {isError && (
            <p className="text-sm text-red-500">Failed to load conversations</p>
          )}
          <ul className="space-y-2">
            {conversations?.map((conversation) => (
              <li
                key={conversation.id}
                onClick={() => setSelectedId(conversation.id)}
                className="text-sm text-gray-800 py-2 px-3 rounded-md hover:bg-gray-100 cursor-pointer"
              >
                {conversation.title}
              </li>
            ))}
          </ul>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}

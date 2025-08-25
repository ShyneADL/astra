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

async function fetchConversations() {
  const { data, error } = await supabase.from("chat_sessions").select("title");
  if (error) {
    throw new Error(error.message);
  }
  return data.map((conv: { title: string }) => conv.title);
}

export function AppSidebar() {
  const queryClient = useQueryClient();

  const {
    data: conversationTitles,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["chat_sessions"] as const,
    queryFn: fetchConversations,
  });

  useEffect(() => {
    const channel = supabase
      .channel("chat_sessions-changes")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_sessions" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat_sessions"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_sessions" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["chat_sessions"] });
        }
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "chat_sessions" },
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
          <h3 className="text-sm font-bold text-gray-600 ">Conversations</h3>
          {isLoading && <p className="text-sm text-gray-500">Loading...</p>}
          {isError && (
            <p className="text-sm text-red-500">Failed to load conversations</p>
          )}
          <ul className="space-y-2">
            {conversationTitles?.map((title, index) => (
              <li
                key={index}
                className="text-sm text-gray-800 py-3 hover:bg-gray-100"
              >
                {title}
              </li>
            ))}
          </ul>
        </SidebarGroup>
        <SidebarGroup />
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
}

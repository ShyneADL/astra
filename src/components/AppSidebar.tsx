import { Suspense, useEffect, useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
} from "@/components/ui/sidebar";
import { ConversationList } from "./ConversationList";
import { supabase } from "@/lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import { useSelectedConversation } from "@/contexts/SelectedConversationContext";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@mui/material";
import { useVirtualizer } from "@tanstack/react-virtual";

type ConversationItem = {
  id: string;
  title: string;
};

interface AppSidebarProps {
  onConversationSelect: () => void;
}

export const AppSidebar = ({ onConversationSelect }: AppSidebarProps) => {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const { setSelectedId } = useSelectedConversation();
  const queryClient = useQueryClient();
  const { user, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  const {
    data: conversations = [],
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["chat_sessions", user?.id],
    queryFn: async (): Promise<ConversationItem[]> => {
      if (!user?.id) {
        return [];
      }

      const { data, error } = await supabase
        .from("chat_sessions")
        .select("id, title")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data || [];
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!user?.id,
    retry: 3,
    retryDelay: 1000,
  });

  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel("chat_sessions_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "chat_sessions" },
        () => {
          queryClient.invalidateQueries({
            queryKey: ["chat_sessions", user.id],
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient, user?.id]);

  useEffect(() => {
    let isMounted = true;

    const resolveName = (user: any | null) => {
      const nameFromMeta =
        user?.user_metadata?.full_name || user?.user_metadata?.name || null;
      return nameFromMeta || user?.email || null;
    };

    const loadUser = async () => {
      const { data: { user } = { user: null } } = await supabase.auth.getUser();
      if (isMounted) {
        setDisplayName(resolveName(user));
      }
    };

    loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) {
        setDisplayName(resolveName(session?.user ?? null));
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut();
      navigate("/login");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleConversationClick = (conversationId: string) => {
    setSelectedId(conversationId);
    onConversationSelect();
  };

  const parentRef = useRef<HTMLDivElement>(null);

  const rowVirtualizer = useVirtualizer({
    count: conversations.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 60,
    overscan: 5,
  });

  // Debug logging for rendering
  console.log("Render state:", {
    user: !!user,
    userId: user?.id,
    authLoading,
    isLoading,
    isError,
    conversationsLength: conversations.length,
    conversations: conversations.slice(0, 3), // Show first 3 for debugging
    queryEnabled: !!user?.id,
  });
  return (
    <Sidebar className="bg-white">
      <SidebarContent>
        <SidebarGroup className="relative h-full flex flex-col justify-between bg-white">
          <div className="h-[150px] lg:h-[200px] xl:h-[250px]">
            <img
              src="/logo.png"
              alt="Logo"
              className="size-10 object-contain"
            />
          </div>
          {authLoading && <Skeleton className="h-full flex-1 w-full" />}
          {user && isLoading && <Skeleton className="h-full flex-1 w-full" />}
          {!authLoading && !user && (
            <p className="text-sm text-gray-500">
              <Link to="/login" className="hover:underline hover:text-blue-400">
                Login
              </Link>{" "}
              to see your conversation history
            </p>
          )}
          {isError && (
            <p className="text-sm text-red-500">Failed to load conversations</p>
          )}
          {!authLoading && user && !isLoading && conversations.length === 0 && (
            <p className="text-sm text-gray-500">No conversations yet</p>
          )}
          {conversations.length > 0 && (
            <div className="max-h-[50vh] overflow-y-auto">
              <ConversationList
                conversations={conversations}
                onSelect={handleConversationClick}
              />
            </div>
          )}

          <div>
            <Suspense
              fallback={<Skeleton className="w-full" animation="pulse" />}
            >
              {user && (
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    {user?.user_metadata?.avatar_url && (
                      <img
                        src={user.user_metadata.avatar_url}
                        alt="Profile"
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    )}
                    <span className="font-medium">
                      {displayName ?? "Guest"}
                    </span>
                  </div>
                  <span>
                    Not You?{" "}
                    <button
                      onClick={handleLogout}
                      className="text-red-500 hover:text-red-400 underline cursor-pointer"
                    >
                      Log out
                    </button>
                  </span>
                </div>
              )}
              {!user && (
                <Link to="/login" className="text-sm text-gray-600">
                  Login
                </Link>
              )}
            </Suspense>
          </div>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
};

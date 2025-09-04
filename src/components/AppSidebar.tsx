import { Suspense, useEffect, useState, useRef } from "react"; // Add useRef
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
import { useVirtualizer } from "@tanstack/react-virtual"; // Add this import

type ConversationItem = {
  id: string;
  title: string;
};

// Add onConversationSelect to component props
interface AppSidebarProps {
  onConversationSelect: () => void;
}

export const AppSidebar = ({ onConversationSelect }: AppSidebarProps) => {
  const [displayName, setDisplayName] = useState<string | null>(null);
  const { setSelectedId } = useSelectedConversation();
  const queryClient = useQueryClient();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const {
    data: conversations = [],
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
      return data || [];
    },
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
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
          {user && isLoading && <Skeleton className="h-full flex-1 w-full" />}
          {!user && (
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
          <Suspense
            fallback={
              <Skeleton
                className="min-h-[50vh] h-full flex-1 w-full"
                animation="pulse"
              />
            }
          >
            <div
              ref={parentRef}
              className="max-h-[50vh] overflow-y-auto"
              style={{
                width: "100%",
              }}
            >
              <div
                style={{
                  height: `${rowVirtualizer.getTotalSize()}px`,
                  width: "100%",
                  position: "relative",
                }}
              >
                {rowVirtualizer.getVirtualItems().map((virtualItem) => (
                  <div
                    key={conversations[virtualItem.index].id}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      width: "100%",
                      height: `${virtualItem.size}px`,
                      transform: `translateY(${virtualItem.start}px)`,
                    }}
                  >
                    <ConversationList
                      conversations={[conversations[virtualItem.index]]}
                      onSelect={handleConversationClick}
                    />
                  </div>
                ))}
              </div>
            </div>
          </Suspense>

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

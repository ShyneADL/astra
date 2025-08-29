import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarHeader,
} from "@/components/ui/sidebar";
import { supabase } from "@/lib/supabase";
import { Link, useNavigate } from "react-router-dom";
import { useSelectedConversation } from "@/contexts/SelectedConversationContext";
import { useAuth } from "@/contexts/AuthContext";

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
      navigate("/auth");
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handleConversationClick = (conversationId: string) => {
    setSelectedId(conversationId);
    onConversationSelect();
  };

  return (
    <Sidebar className="bg-white">
      <SidebarHeader />
      <SidebarContent>
        <SidebarGroup className="relative">
          <div className="h-[150px] lg:h-[200px] xl:h-[250px]">
            <img
              src="/logo.png"
              alt="Logo"
              className="size-10 object-contain"
            />
          </div>
          {user && isLoading && (
            <p className="text-sm text-gray-500">Loading...</p>
          )}
          {!user && (
            <p className="text-sm text-gray-500">
              <Link to="/auth" className="hover:underline hover:text-blue-400">
                Login
              </Link>{" "}
              to see your conversation history
            </p>
          )}
          {isError && (
            <p className="text-sm text-red-500">Failed to load conversations</p>
          )}
          <ul className="space-y-2">
            {conversations?.map((conversation) => (
              <li
                key={conversation.id}
                onClick={() => handleConversationClick(conversation.id)}
                className="text-sm text-gray-800 py-2 px-3 rounded-md hover:bg-gray-100 cursor-pointer"
              >
                {conversation.title}
              </li>
            ))}
          </ul>
          {user && (
            <>
              <div className="flex items-center gap-3">
                {user?.user_metadata?.avatar_url && (
                  <img
                    src={user.user_metadata.avatar_url}
                    alt="Profile"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                )}
                <span className="font-medium">{displayName ?? "Guest"}</span>
              </div>
              <span>
                Not You?{" "}
                <button
                  onClick={handleLogout}
                  className="text-sm text-red-500 hover:text-red-400 underline cursor-pointer"
                >
                  Log out
                </button>
              </span>
            </>
          )}
          {!user && (
            <Link to="/auth" className="text-sm text-gray-600">
              Login
            </Link>
          )}
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter />
    </Sidebar>
  );
};

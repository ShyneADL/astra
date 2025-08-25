// File: Dashboard.tsx — function Dashboard
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";

import { supabase } from "@/lib/supabase";
import ChatInterface from "./AIChat/ChatInterface";
import VoiceChat from "./AIChat/VoiceChat";
import Conversation1 from "./AIChat/Conversation";

export default function Dashboard() {
  const [displayName, setDisplayName] = useState<string | null>(null);

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

  return (
    <SidebarProvider>
      <AppSidebar />
      <main className="min-h-screen bg-gray-50 flex-1">
        <header className="bg-white shadow-sm border-b">
          <SidebarTrigger />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center py-4">
              <div className="flex items-center">
                <h1 className="text-2xl font-bold text-gray-900">astra</h1>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">{displayName ?? "Guest"}</span>
                </div>
                <Link to="/auth" className="text-sm text-gray-600">
                  Login
                </Link>
              </div>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            <div className="bg-white rounded-lg shadow-sm border h-[calc(100vh-200px)]">
              {/* <VoiceChat /> */}
              <Conversation1 />
            </div>
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
}

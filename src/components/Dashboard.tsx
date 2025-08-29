// File: Dashboard.tsx — function Dashboard
import { useState } from "react";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import VoiceChat from "./AIChat/VoiceChat";
import Conversation from "./AIChat/Conversation";
import { SelectedConversationProvider } from "@/contexts/SelectedConversationContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export default function Dashboard() {
  const [chatMode, setChatMode] = useState<"text" | "voice">("voice");

  const handleModeChange = (value: "text" | "voice") => {
    setChatMode(value);
  };

  return (
    <SelectedConversationProvider>
      <SidebarProvider>
        <AppSidebar onConversationSelect={() => setChatMode("text")} />
        <main className="min-h-screen bg-gray-50 flex-1">
          <header className="bg-white shadow-sm border-b">
            <div className="px-4 sm:px-6 lg:px-8">
              <div className="flex justify-between items-center py-4">
                <SidebarTrigger />
                <div className="flex items-center gap-2">
                  <Select value={chatMode} onValueChange={handleModeChange}>
                    <SelectTrigger className="w-full text-sm">
                      <SelectValue placeholder="Select chat mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text Chat</SelectItem>
                      <SelectItem value="voice">Voice Chat</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="overflow-hidden">
                    <div
                      className={`transform transition-all duration-300 ease-in-out ${
                        chatMode === "text"
                          ? "translate-x-0 opacity-100"
                          : "translate-x-full opacity-0"
                      }`}
                    >
                      <button className="bg-primary rounded-sm whitespace-nowrap py-2 px-4 text-sm text-black cursor-pointer hover:bg-primary/90">
                        New Chat
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </header>
          <div className="w-full max-h-[90vh] h-full py-6 sm:px-6 lg:px-8">
            <div className="relative w-full h-full">
              <div
                className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${
                  chatMode === "voice" ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
                <VoiceChat />
              </div>
              <div
                className={`absolute inset-0 transition-opacity duration-300 ease-in-out ${
                  chatMode === "text" ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
                <Conversation />
              </div>
            </div>
          </div>
        </main>
      </SidebarProvider>
    </SelectedConversationProvider>
  );
}

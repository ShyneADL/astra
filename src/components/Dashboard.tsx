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
import { Button } from "./ui/button";
import { PlusCircle } from "lucide-react";
import { NewChat } from "./AIChat/NewChat";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
}

export default function Dashboard() {
  const [chatMode, setChatMode] = useState<"text" | "voice">("text");
  const [hasActiveChat, setHasActiveChat] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);

  const handleModeChange = (value: "text" | "voice") => {
    setChatMode(value);
  };

  const handleStartNewChat = () => {
    setHasActiveChat(false);
    setMessages([]);
    setChatMode("text");
  };

  return (
    <SelectedConversationProvider>
      <SidebarProvider>
        <AppSidebar onConversationSelect={() => setChatMode("text")} />
        <main className="min-h-[100dvh] bg-gray-50 flex-1 p-2">
          <header className="bg-white shadow-sm border-b rounded-lg">
            <div className="pr-3 pl-1">
              <div className="flex justify-between items-center py-2">
                <SidebarTrigger />
                <div className="flex items-center gap-2">
                  <Select value={chatMode} onValueChange={handleModeChange}>
                    <SelectTrigger className="w-full text-sm font-semibold">
                      <SelectValue placeholder="Select chat mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Text Chat</SelectItem>
                      <SelectItem value="voice">Voice Chat</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="w-fit">
                    <Button
                      className="bg-primary rounded-sm whitespace-nowrap px-4 text-sm text-white cursor-pointer hover:bg-primary/90"
                      onClick={handleStartNewChat}
                    >
                      <PlusCircle className="text-white" /> New Chat
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </header>
          <div className="w-full max-h-[90vh] h-full py-6">
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
                {!hasActiveChat ? (
                  <NewChat
                    messages={messages}
                    setMessages={setMessages}
                    onChatStart={() => setHasActiveChat(true)}
                  />
                ) : (
                  <Conversation
                    initialMessages={messages}
                    setMessages={setMessages}
                  />
                )}
              </div>
            </div>
          </div>
        </main>
      </SidebarProvider>
    </SelectedConversationProvider>
  );
}

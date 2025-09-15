import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import VoiceChat from "./chat/VoiceChat";
import Conversation from "./chat/Conversation";
import { NewChat } from "./chat/NewChat";
import { useSelectedConversation } from "@/contexts/SelectedConversationContext";
import { useChatMessages } from "@/hooks/use-chat-messages";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { Button } from "./ui/button";
import { Loader2, PlusCircle } from "lucide-react";

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
  const { selectedId, setSelectedId } = useSelectedConversation();

  const { data: cachedMessages = [], isLoading: loading } = useChatMessages({
    conversationId: selectedId,
  });

  useEffect(() => {
    if (cachedMessages.length > 0) {
      setMessages(cachedMessages);
      setHasActiveChat(true);
    }
  }, [cachedMessages]);

  useEffect(() => {
    if (messages.length > 0 && !hasActiveChat) {
      console.log(
        "Dashboard: Auto-switching to conversation view due to messages"
      );
      setHasActiveChat(true);
    }
  }, [messages.length, hasActiveChat]);

  const handleModeChange = (value: "text" | "voice") => {
    setChatMode(value);
  };

  const handleStartNewChat = () => {
    setHasActiveChat(false);
    setMessages([]);
    setChatMode("text");
    if (selectedId) {
      setSelectedId(null);
    }
  };

  return (
    <SidebarProvider>
      <AppSidebar
        onConversationSelect={() => {
          setChatMode("text");
          setHasActiveChat(true);
        }}
      />
      <main className="min-h-[100dvh] bg-[#f6fcfe] flex-1 p-2">
        <header className="bg-white shadow-sm border-b rounded-lg">
          <div className="pr-3 pl-1">
            <div className="flex justify-between items-center py-2">
              <SidebarTrigger className="hover:bg-primary hover:text-white cursor-pointer" />
              <div className="flex items-center gap-2">
                <Select value={chatMode} onValueChange={handleModeChange}>
                  <SelectTrigger className="w-full text-sm font-semibold cursor-pointer">
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
                <NewChat messages={messages} setMessages={setMessages} />
              ) : (
                <>
                  {loading && (
                    <div className="border-border bg-card w-full h-full overflow-hidden rounded-xl border shadow-lg">
                      <Loader2 className="animate-spin text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 size-40" />
                    </div>
                  )}
                  {!loading && (
                    <Conversation
                      initialMessages={messages}
                      setMessages={setMessages}
                    />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </main>
    </SidebarProvider>
  );
}

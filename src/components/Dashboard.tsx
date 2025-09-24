import { useState, useEffect } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
// import VoiceChat from "./chat/VoiceChat";
import Conversation from "./chat/Conversation";
import { NewChat } from "./chat/NewChat";
import { useSelectedConversation } from "@/contexts/SelectedConversationContext";
import { useChatMessages } from "@/hooks/use-chat-messages";
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
  const [chatState, setChatState] = useState({
    hasActiveChat: false,
    isTransitioningFromNewChat: false,
    isAwaitingResponse: false, // Add this to track when we're waiting for AI
  });
  const [messages, setMessages] = useState<Message[]>([]);
  const [isNewChatSubmitting, setIsNewChatSubmitting] = useState(false);
  const { selectedId, setSelectedId } = useSelectedConversation();

  const { data: cachedMessages = [], isLoading: loading } = useChatMessages({
    conversationId: selectedId,
  });

  useEffect(() => {
    if (cachedMessages.length > 0) {
      setMessages(cachedMessages);
      setChatState((prev) => ({
        ...prev,
        hasActiveChat: true,
        isTransitioningFromNewChat: false,
        isAwaitingResponse: false,
      }));
    }
  }, [cachedMessages]);

  // Modified: Immediate transition on first message
  useEffect(() => {
    if (messages.length > 0 && !chatState.hasActiveChat) {
      setChatState({
        hasActiveChat: true,
        isTransitioningFromNewChat: true,
        isAwaitingResponse: true, // We're waiting for AI response
      });
    }
  }, [messages.length, chatState.hasActiveChat]);

  const handleStartNewChat = () => {
    setChatState({
      hasActiveChat: false,
      isTransitioningFromNewChat: false,
      isAwaitingResponse: false,
    });
    setMessages([]);
    setChatMode("text");
    if (selectedId) {
      setSelectedId(null);
    }
  };

  // Add this function to handle when NewChat submits optimistically
  const handleNewChatSubmit = (optimisticMessage: Message) => {
    // Immediately add the user message and transition to Conversation
    setMessages([optimisticMessage]);
    setChatState({
      hasActiveChat: true,
      isTransitioningFromNewChat: true,
      isAwaitingResponse: true,
    });
  };

  // Add this to handle when AI response is received
  const handleAIResponse = (aiMessage: Message) => {
    setMessages((prev) => [...prev, aiMessage]);
    setChatState((prev) => ({
      ...prev,
      isAwaitingResponse: false,
    }));
  };

  return (
    <SidebarProvider>
      <AppSidebar
        onConversationSelect={() => {
          setChatMode("text");
          setChatState((prev) => ({
            ...prev,
            hasActiveChat: true,
            isTransitioningFromNewChat: false,
          }));
        }}
      />
      <main className="min-h-[100dvh] bg-[#f6fcfe] flex-1 p-2">
        <header className="bg-white shadow-sm border-b rounded-lg">
          <div className="pr-3 pl-1">
            <div className="flex justify-between items-center py-2">
              <SidebarTrigger className="hover:bg-primary hover:text-white cursor-pointer" />
              <div className="flex items-center gap-2">
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
                chatMode === "text" ? "opacity-100 z-10" : "opacity-0 z-0"
              }`}
            >
              {!chatState.hasActiveChat ? (
                <NewChat
                  setMessages={setMessages}
                  setIsSubmitting={setIsNewChatSubmitting}
                  onOptimisticSubmit={handleNewChatSubmit} // Pass the optimistic handler
                />
              ) : (
                <>
                  {loading &&
                    !isNewChatSubmitting &&
                    !chatState.isTransitioningFromNewChat && (
                      <div className="border-border bg-card w-full h-full overflow-hidden rounded-xl border shadow-lg">
                        <Loader2 className="animate-spin text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 size-40" />
                      </div>
                    )}
                  {(!loading || chatState.isTransitioningFromNewChat) && (
                    <Conversation
                      initialMessages={messages}
                      setMessages={setMessages}
                      isAwaitingResponse={chatState.isAwaitingResponse}
                      onAIResponse={handleAIResponse}
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

import { useState } from "react";
import { Button } from "../ui/button";
import { supabase } from "@/lib/supabase";
import { useQueryClient } from "@tanstack/react-query";
import { Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
}

interface NewChatProps {
  onChatStart: () => void;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export const NewChat = ({
  onChatStart,
  messages,
  setMessages,
}: NewChatProps) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 24,
    maxHeight: 200,
  });
  const queryClient = useQueryClient();

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    // Create AI message placeholder
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      content: "...",
      sender: "ai",
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage, aiMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    try {
      const draftTitle = input.trim();
      const needTitle = !sessionId;
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          messages: updatedMessages.map(({ sender, content }) => ({
            role: sender === "user" ? "user" : "assistant",
            content,
          })),
          conversationId,
          message: draftTitle,
          wantTitle: needTitle,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to get AI response");
      }

      const serverConvId = response.headers.get("X-Conversation-Id");
      const generatedTitle = response.headers.get("X-Generated-Title");

      if (serverConvId && !conversationId) {
        setConversationId(serverConvId);
      }

      if (needTitle && generatedTitle && !sessionId) {
        try {
          // Create a new chat session in Supabase
          const { data: newSession, error } = await supabase
            .from("chat_sessions")
            .insert([
              {
                title: generatedTitle,
                created_at: new Date().toISOString(),
              },
            ])
            .select()
            .single();

          if (error) throw error;

          setSessionId(newSession.id);
          setConversationId(newSession.id);

          // Refresh the sidebar to show the new conversation
          queryClient.invalidateQueries({ queryKey: ["chat_sessions"] });
        } catch (error) {
          console.error("Failed to create session with title:", error);
        }
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let aiResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        aiResponse += chunk;

        setMessages((prev) =>
          prev.map((m) =>
            m.id === aiMessageId ? { ...m, content: aiResponse } : m
          )
        );
      }

      // Only switch to conversation view after everything is complete
      onChatStart();
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId
            ? {
                ...msg,
                content: "Sorry, I encountered an error. Please try again.",
              }
            : msg
        )
      );
    } finally {
      setIsTyping(false);
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    adjustHeight();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (input.trim()) {
        handleSendMessage(e);
      }
    }
  };

  return (
    <div className="flex h-full w-full flex-col items-center justify-between px-4 pb-6 pt-16 lg:pb-12 lg:pt-32">
      <div className="flex flex-col items-center space-y-8">
        <img
          src="/logo-large.png"
          alt="astra logo"
          className="h-16 w-16 rounded-full object-contain shadow-lg"
        />
        <div className="space-y-2 text-center">
          <p className="text-base text-gray-400">Hi there 👋</p>
          <h1 className="text-xl font-semibold text-gray-900">
            What would you like to talk about today?
          </h1>
        </div>
      </div>

      <div className="w-full max-w-2xl">
        <form
          onSubmit={handleSendMessage}
          className={cn(
            "flex space-x-2 p-2 border border-accent-foreground rounded-xl",
            "focus-within:border-ring focus-within:ring-ring/50 focus-within:ring-[3px]",
            "bg-background/80 backdrop-blur-sm"
          )}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className={cn(
              "flex-1 resize-none bg-transparent px-3 py-2",
              "border-0 outline-none focus:ring-0",
              "text-base placeholder:text-muted-foreground",
              "min-h-[24px] max-h-[200px]"
            )}
            style={{
              overflow: input ? "auto" : "hidden",
            }}
          />
          <Button
            type="submit"
            size="icon"
            className={cn(
              "bg-primary hover:bg-primary/90 w-fit px-4",
              "self-end"
            )}
            disabled={isTyping || !input.trim()}
          >
            <Send className="h-4 w-4 mr-2" />
            Send
          </Button>
        </form>
      </div>
    </div>
  );
};

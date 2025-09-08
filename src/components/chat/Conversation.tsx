"use client";

import { useState, useEffect, useRef } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { useSelectedConversation } from "@/contexts/SelectedConversationContext";
import { getChatMessages, getChatSessionById } from "@/lib/db";
import ChatBubble from "./ChatBubble";
import { useAutoResizeTextarea } from "@/hooks/use-auto-resize-textarea";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
}

interface ConversationProps {
  initialMessages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
}

export default function Conversation({
  initialMessages,
  setMessages,
}: ConversationProps) {
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 36,
    maxHeight: 200,
  });
  const { selectedId } = useSelectedConversation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  interface Message {
    id: string;
    content: string;
    sender: "user" | "ai";
    timestamp: string;
  }

  useEffect(() => {
    if (!selectedId) return;

    let cancelled = false;
    (async () => {
      try {
        const session = await getChatSessionById(selectedId);
        if (!session?.id) {
          console.warn("No session found for id:", selectedId);
          if (!cancelled) {
            setMessages([]);
            setConversationId(null);
          }
          return;
        }

        if (!cancelled) {
          setConversationId(session.id);
        }

        const data = await getChatMessages(session.id);

        const loaded: Message[] =
          (data || []).map((row: any) => {
            const senderRaw = row.role ?? "assistant";
            const sender =
              senderRaw === "assistant" || senderRaw === "ai"
                ? ("ai" as const)
                : ("user" as const);
            return {
              id: String(row.id),
              content: row.content,
              sender,
              timestamp: row.created_at,
            };
          }) ?? [];

        if (!cancelled) {
          setMessages(loaded);
        }
      } catch (err) {
        console.error("Failed to load conversation:", err);
        if (!cancelled) setMessages([]);
      } finally {
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  // Listen for scroll events to track if user is at bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      // Add buffer to account for minor rendering differences
      if (container.scrollTop + container.clientHeight >= container.scrollHeight - 1) {
        setIsScrolledToBottom(true);
      } else {
        setIsScrolledToBottom(false);
      }
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Smart auto-scroll: only scroll if user is at bottom
  useEffect(() => {
    if (isScrolledToBottom && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [initialMessages, isScrolledToBottom]);

  // Initial scroll to bottom on load
  useEffect(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 200);
    }
  }, []);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...initialMessages, userMessage];
    setMessages(updatedMessages);
    setInput("");

    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      content: "",
      sender: "ai",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, aiMessage]);

    const API_URL = "http://localhost:3001";

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      const response = await fetch(`${API_URL}/api/chat`, {
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
          conversationId: selectedId, // Always use selectedId for existing conversations
          wantTitle: false, // Don't generate titles for existing conversations
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to get AI response");
      }

      const serverConvId = response.headers.get("X-Conversation-Id");
      if (serverConvId && !conversationId) {
        setConversationId(serverConvId);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      let aiResponse = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        aiResponse += chunk;

        // Update the AI message with streaming content in real-time
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === aiMessageId ? { ...msg, content: aiResponse } : msg
          )
        );
      }
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
    <div className="border-border bg-card w-full h-full overflow-hidden rounded-xl border shadow-lg">
      <div className="flex h-full flex-col justify-between">
        <div ref={messagesContainerRef} className="flex-1 space-y-4 overflow-y-auto p-4">
          {initialMessages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message.content}
              isUser={message.sender === "user"}
              timestamp={new Date(message.timestamp)}
            />
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-border border-t p-4">
          <form
            onSubmit={handleSendMessage}
            className="flex space-x-2 items-end"
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
                "min-h-[36px] max-h-[200px] overflow-hidden resize-none leading-[100%] placeholder:leading-[100%]"
              )}
              style={{
                overflow: input ? "auto" : "hidden",
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="bg-primary hover:bg-primary/90"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

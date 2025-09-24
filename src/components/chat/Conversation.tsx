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
import TypingIndicator from "./TypingIndicator";

interface Message {
  id: string;
  content: string;
  sender: "user" | "ai";
  timestamp: string;
  failed?: boolean;
}

interface ConversationProps {
  initialMessages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  isAwaitingResponse?: boolean;
  onAIResponse?: (message: Message) => void;
}

// Helper function to generate unique IDs
const generateUniqueId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export default function Conversation({
  initialMessages,
  setMessages,
  isAwaitingResponse = false,
  onAIResponse,
}: ConversationProps) {
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({
    minHeight: 36,
    maxHeight: 200,
  });
  const { selectedId, setSelectedId } = useSelectedConversation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolledToBottom, setIsScrolledToBottom] = useState(true);

  const bufferRef = useRef<string[]>([]);
  const currentAiMessageIdRef = useRef<string | null>(null);

  useEffect(() => {
    console.log("Rendering Conversation with messages:", initialMessages);
  }, []);

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
          setConversationId(selectedId);
        }

        const data = await getChatMessages(selectedId);

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
          // Only load from database if we don't have messages from NewChat
          if (initialMessages.length === 0) {
            setMessages(loaded);
          }
        }
      } catch (err) {
        console.error("Failed to load conversation:", err);
        if (!cancelled && initialMessages.length === 0) setMessages([]);
      } finally {
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId, initialMessages.length, setMessages]);

  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (
        container.scrollTop + container.clientHeight >=
        container.scrollHeight - 1
      ) {
        setIsScrolledToBottom(true);
      } else {
        setIsScrolledToBottom(false);
      }
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (isScrolledToBottom && messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      requestAnimationFrame(() => {
        container.scrollTop = container.scrollHeight;
      });
    }
  }, [initialMessages, isScrolledToBottom]);

  useEffect(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      setTimeout(() => {
        container.scrollTop = container.scrollHeight;
      }, 200);
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      if (bufferRef.current.length > 0 && currentAiMessageIdRef.current) {
        const tokens = bufferRef.current.join("");
        bufferRef.current = [];

        setMessages?.((prev) =>
          prev.map((m) =>
            m.id === currentAiMessageIdRef.current
              ? { ...m, content: m.content + tokens }
              : m
          )
        );

        // Always auto-scroll during streaming, or if user is at bottom
        if (
          (isStreaming && currentAiMessageIdRef.current) ||
          isScrolledToBottom
        ) {
          if (messagesContainerRef.current) {
            requestAnimationFrame(() => {
              const container = messagesContainerRef.current;
              if (container) {
                container.scrollTop = container.scrollHeight;
              }
            });
          }
        }
      }
    }, 50); // Batch every 50ms for smooth streaming

    return () => clearInterval(interval);
  }, [setMessages, isScrolledToBottom, isStreaming]);

  const addTokenToBuffer = (token: string) => {
    bufferRef.current.push(token);
  };

  async function sendMessageToAPI(
    userMessage: Message,
    messagesHistory: Message[]
  ) {
    const aiMessageId = generateUniqueId();
    const aiMessage: Message = {
      id: aiMessageId,
      content: "",
      sender: "ai",
      timestamp: new Date().toISOString(),
    };

    // Reset any existing streaming state
    currentAiMessageIdRef.current = null;
    bufferRef.current = [];

    setMessages?.((prev) => [...prev, aiMessage]);
    setIsStreaming(true);

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
          messages: messagesHistory.map(({ sender, content }) => ({
            role: sender === "user" ? "user" : "assistant",
            content,
          })),
          conversationId: selectedId ?? conversationId,
          message: userMessage.content,
          wantTitle: false,
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to get AI response");
      }

      // Set the current message ID only after successful response
      currentAiMessageIdRef.current = aiMessageId;
      let aiResponse = "";

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          aiResponse += chunk;
          addTokenToBuffer(chunk);
        }
      } catch (streamError) {
        // Handle stream interruption
        console.error("Stream error:", streamError);
        throw new Error("Stream interrupted");
      }

      // Clear streaming state
      currentAiMessageIdRef.current = null;
      bufferRef.current = [];
      setIsStreaming(false);

      if (onAIResponse) {
        const completedAiMessage = {
          ...aiMessage,
          content:
            aiResponse || "Sorry, the response was empty. Please try again.",
          failed: !aiResponse,
        };
        onAIResponse(completedAiMessage);
      }
    } catch (error) {
      console.error("Error:", error);

      // Clear streaming state
      currentAiMessageIdRef.current = null;
      bufferRef.current = [];
      setIsStreaming(false);

      // Update both messages to failed state
      setMessages?.((prev) =>
        prev.map((msg) =>
          msg.id === userMessage.id
            ? { ...msg, failed: true }
            : msg.id === aiMessageId
            ? {
                ...msg,
                content: "Sorry, I encountered an error. Please try again.",
                failed: true,
              }
            : msg
        )
      );
    }
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: generateUniqueId(), // Use unique ID generator
      content: input,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...initialMessages, userMessage];
    setMessages?.(updatedMessages);
    setInput("");

    await sendMessageToAPI(userMessage, updatedMessages);
  }

  const handleRetry = async (messageId: string) => {
    const message = initialMessages.find((msg) => msg.id === messageId);
    if (!message || message.sender !== "user") return;

    setMessages?.((prev) =>
      prev.map((msg) =>
        msg.id === messageId ? { ...msg, failed: undefined } : msg
      )
    );

    const messageIndex = initialMessages.findIndex(
      (msg) => msg.id === messageId
    );
    const messagesUpToRetry = initialMessages.slice(0, messageIndex + 1);

    await sendMessageToAPI(message, messagesUpToRetry);
  };

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

  // Create a unique list of messages to prevent duplicates
  const uniqueMessages = initialMessages.filter(
    (message, index, self) =>
      index === self.findIndex((m) => m.id === message.id)
  );

  return (
    <div className="border-border bg-card w-full h-full overflow-hidden rounded-xl border shadow-lg">
      <div className="flex h-full flex-col justify-between">
        <div
          ref={messagesContainerRef}
          className="flex-1 space-y-4 overflow-y-auto p-4"
        >
          {uniqueMessages.map((message) => (
            <ChatBubble
              key={message.id}
              message={message.content}
              isUser={message.sender === "user"}
              timestamp={new Date(message.timestamp)}
              isStreaming={
                (isStreaming &&
                  message.sender === "ai" &&
                  message.content === "") ||
                (isAwaitingResponse &&
                  message === uniqueMessages[uniqueMessages.length - 1])
              }
              failed={message.failed}
              messageId={message.id}
              onRetry={handleRetry}
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
                "w-full resize-none border-0 bg-transparent p-0 text-sm placeholder:text-muted-foreground focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50",
                "min-h-[36px] max-h-[200px]"
              )}
              disabled={isStreaming}
              style={{
                overflow: input ? "auto" : "hidden",
              }}
            />
            <Button
              type="submit"
              size="icon"
              className="bg-primary hover:bg-primary/90"
              disabled={isStreaming || !input.trim()}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

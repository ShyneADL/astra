"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Mic, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { createChatSession } from "@/lib/db";

const initialMessages = [
  {
    id: "1",
    content:
      "Hi there! My name is Astra and I am your emotional support buddy today. How can I assist you?",
    sender: "ai",
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
];

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
}

function ChatBubble({ message, isUser, timestamp }: ChatBubbleProps) {
  const formattedTime = timestamp.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "flex max-w-[80%] items-start space-x-2",
          isUser && "flex-row-reverse space-x-reverse"
        )}
      >
        <div
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full",
            isUser ? "bg-primary/10" : "bg-muted"
          )}
        >
          {isUser ? (
            <User className="text-black h-4 w-4" />
          ) : (
            <Bot className="text-muted-foreground h-4 w-4" />
          )}
        </div>

        <div className="flex flex-col">
          <div
            className={cn(
              "rounded-2xl px-4 py-2 shadow-sm",
              isUser
                ? "bg-primary text-black rounded-tr-none"
                : "border-border bg-card text-card-foreground rounded-tl-none border"
            )}
          >
            <p className="whitespace-pre-wrap">{message}</p>
          </div>

          <span
            className={cn(
              "text-muted-foreground mt-1 text-xs",
              isUser ? "text-right" : "text-left"
            )}
          >
            {formattedTime}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function Conversation1() {
  const [messages, setMessages] = useState(initialMessages);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [listening, setListening] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const stopRequestedRef = useRef(false);

  useEffect(() => {
    isListeningRef.current = isListening;
  }, [isListening]);

  useEffect(() => {
    const w = window as any;
    const Recognition = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!Recognition) {
      console.warn("SpeechRecognition API not supported in this browser");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-US";
    recognition.continuous = true; // keep listening across multiple phrases
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = "";
      let interimTranscript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) finalTranscript += result[0].transcript;
        else interimTranscript += result[0].transcript;
      }

      // If you want to append the final transcript to your message input, do it here:
      // setInput((prev: string) => (prev + " " + finalTranscript).trim());
      // You can also surface interimTranscript in the UI if desired.
    };

    recognition.onerror = (e: any) => {
      console.warn("SpeechRecognition error:", e.error);
      // Recover on transient errors if user didn't click stop
      if (
        !stopRequestedRef.current &&
        (e.error === "no-speech" || e.error === "network")
      ) {
        try {
          recognition.stop(); // triggers onend where we auto-restart
        } catch {}
      } else {
        // Permission or user stop – don't auto-restart
        stopRequestedRef.current = true;
      }
    };

    recognition.onend = () => {
      // Only auto-restart if the user didn't explicitly stop
      if (!stopRequestedRef.current) {
        try {
          recognition.start();
        } catch {
          // Some browsers need a tiny delay before restarting
          setTimeout(() => {
            try {
              recognition.start();
            } catch {}
          }, 250);
        }
      } else {
        setIsListening(false);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      try {
        recognition.onstart = null;
        recognition.onresult = null;
        recognition.onerror = null;
        recognition.onend = null;
        recognition.stop();
      } catch {}
    };
  }, []);

  const startListening = useCallback(async () => {
    const w = window as any;
    if (!w.SpeechRecognition && !w.webkitSpeechRecognition) return;

    stopRequestedRef.current = false;

    // Prompt for mic permission first to avoid immediate end
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.warn("Microphone permission denied or unavailable", err);
      setIsListening(false);
      return;
    }

    try {
      recognitionRef.current?.start();
    } catch {
      // Ignore InvalidStateError if already started
    }
  }, []);

  const stopListening = useCallback(() => {
    stopRequestedRef.current = true;
    try {
      recognitionRef.current?.stop();
    } catch {}
  }, []);

  const toggleListening = useCallback(() => {
    if (isListeningRef.current) {
      stopListening();
    } else {
      startListening();
    }
  }, [startListening, stopListening]);

  // In component Conversation.tsx — function handleSendMessage
  interface Message {
    id: string;
    content: string;
    sender: "user" | "ai";
    timestamp: string;
  }

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    // Create a chat session on the first user message (before clearing input)
    if (!sessionId) {
      const draftTitle = (input || userMessage.content).trim();
      let title = draftTitle.slice(0, 60) || "New Chat";
      try {
        const res = await fetch("http://localhost:3001/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: draftTitle, wantTitle: true }),
        });
        if (res.ok) {
          const data = await res.json();
          if (
            data?.title &&
            typeof data.title === "string" &&
            data.title.trim()
          ) {
            title = data.title;
          }
        }
      } catch (_err) {}
    }

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInput("");
    setIsTyping(true);

    // Create single AI message placeholder
    const aiMessageId = (Date.now() + 1).toString();
    const aiMessage: Message = {
      id: aiMessageId,
      content: "",
      sender: "ai",
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, aiMessage]);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;

      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({
          messages: updatedMessages,
          conversationId,
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

  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center p-4">
      <div className="border-border bg-card w-full max-w-2xl overflow-hidden rounded-xl border shadow-lg">
        <div className="bg-primary p-4">
          <h1 className="dark:text-primary-foreground text-lg font-semibold">
            AI Assistant
          </h1>
          <p className="dark:text-primary-foreground/80 text-sm">
            Always here to help you
          </p>
        </div>

        <div className="flex h-[600px] flex-col">
          <div className="flex-1 space-y-4 overflow-y-auto p-4">
            {messages.map((message) => (
              <ChatBubble
                key={message.id}
                message={message.content}
                isUser={message.sender === "user"}
                timestamp={new Date(message.timestamp)}
              />
            ))}

            {isTyping && (
              <div className="text-muted-foreground flex items-center space-x-2 text-sm">
                <div className="flex space-x-1">
                  <div
                    className="bg-muted-foreground/70 h-2 w-2 animate-bounce rounded-full"
                    style={{ animationDelay: "0ms" }}
                  ></div>
                  <div
                    className="bg-muted-foreground/70 h-2 w-2 animate-bounce rounded-full"
                    style={{ animationDelay: "150ms" }}
                  ></div>
                  <div
                    className="bg-muted-foreground/70 h-2 w-2 animate-bounce rounded-full"
                    style={{ animationDelay: "300ms" }}
                  ></div>
                </div>
                <span>AI is typing...</span>
              </div>
            )}
          </div>

          <div className="border-border border-t p-4">
            <form onSubmit={handleSendMessage} className="flex space-x-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button
                type="submit"
                size="icon"
                className="bg-primary hover:bg-primary/90"
              >
                <Send className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                size="icon"
                variant={listening ? "destructive" : "outline"}
                onClick={toggleListening}
                title={listening ? "Stop voice input" : "Start voice input"}
              >
                <Mic
                  className={`h-4 w-4 ${listening ? "animate-pulse" : ""}`}
                />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

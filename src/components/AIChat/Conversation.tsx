"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Send, Mic } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/lib/supabase";
import { useSelectedConversation } from "@/contexts/SelectedConversationContext";
import {
  createChatSession,
  getChatMessages,
  getChatSessionById,
} from "@/lib/db";
import ChatBubble from "./ChatBubble";

const initialMessages = [
  {
    id: "1",
    content:
      "Hi there! My name is Astra and I am your emotional support buddy today. How can I assist you?",
    sender: "ai",
    timestamp: new Date(Date.now() - 1000 * 60 * 10).toISOString(),
  },
];

export default function Conversation() {
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

  const { selectedId } = useSelectedConversation();
  const queryClient = useQueryClient();

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
      setIsTyping(true);
      try {
        const session = await getChatSessionById(selectedId);
        if (!session?.id) {
          console.warn("No session found for id:", selectedId);
          if (!cancelled) {
            setMessages([]);
            setSessionId(null);
            setConversationId(null);
          }
          return;
        }

        if (!cancelled) {
          setSessionId(session.id);
          setConversationId(session.id);
        }

        const data = await getChatMessages(session.id);

        const loaded =
          (data || []).map((row: any) => {
            const senderRaw = row.role ?? "assistant";
            const sender =
              senderRaw === "assistant" || senderRaw === "ai" ? "ai" : "user";
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
        if (!cancelled) setIsTyping(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedId]);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

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
      // Single-cycle setup: compute the draft title and whether we need a server-generated title
      const draftTitle = (input || userMessage.content).trim();
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
          messages: updatedMessages,
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
          const newSession = await createChatSession(generatedTitle);
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
    <div className="border-border bg-card w-full h-full overflow-hidden rounded-xl border shadow-lg">
      <div className="bg-primary p-4">
        <h1 className="dark:text-primary-foreground text-lg font-semibold">
          AI Assistant
        </h1>
        <p className="dark:text-primary-foreground/80 text-sm">
          Always here to help you
        </p>
      </div>

      <div className="flex h-[75vh] flex-col">
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
              <Mic className={`h-4 w-4 ${listening ? "animate-pulse" : ""}`} />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}

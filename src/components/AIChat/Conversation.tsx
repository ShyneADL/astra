"use client";

import { useState } from "react";
import { Send, Mic, User, Bot } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { generateResponse } from "@/lib/gemini"

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
            <User className="text-primary h-4 w-4" />
          ) : (
            <Bot className="text-muted-foreground h-4 w-4" />
          )}
        </div>

        <div className="flex flex-col">
          <div
            className={cn(
              "rounded-2xl px-4 py-2 shadow-sm",
              isUser
                ? "bg-primary text-primary-foreground rounded-tr-none"
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
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsTyping(true);

    try {
      // Create AI message placeholder
      const aiMessageId = (Date.now() + 1).toString();
      const aiMessage = {
        id: aiMessageId,
        content: "",
        sender: "ai",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, aiMessage]);

      // Therapist persona instruction (acts like a default role)
      const therapistInstruction = `
You are a compassionate, non-judgmental CBT-oriented therapist named Astra.
- Use an empathetic tone and validate the user's feelings.
- Ask one gentle, open-ended question to help the user reflect.
- Offer short, actionable suggestions when appropriate.
- Avoid medical diagnosis or crisis advice; suggest seeking professional help for emergencies.
`;

      // Call Gemini on the client
      // Make sure you have: import { generateResponse } from "@/lib/gemini";
      const aiText = await generateResponse(
        `${therapistInstruction}\n\nUser: ${currentInput}`
      );

      // Update the placeholder AI message with the response
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === aiMessageId ? { ...msg, content: aiText } : msg
        )
      );

      setIsTyping(false);
    } catch (error) {
      console.error("Error sending message:", error);

      const errorMessage = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I encountered an error. Please try again.",
        sender: "ai",
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, errorMessage]);
      setIsTyping(false);
    }
  };

  return (
    <main className="bg-background flex min-h-screen flex-col items-center justify-center p-4">
      <div className="border-border bg-card w-full max-w-2xl overflow-hidden rounded-xl border shadow-lg">
        <div className="bg-primary p-4">
          <h1 className="text-primary-foreground text-lg font-semibold">
            AI Assistant
          </h1>
          <p className="text-primary-foreground/80 text-sm">
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
              <Button type="button" size="icon" variant="outline">
                <Mic className="h-4 w-4" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}

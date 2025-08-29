import { User, Bot } from "lucide-react";
import { cn } from "@/lib/utils";

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
            <User className="text-white h-4 w-4" />
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

export default ChatBubble;

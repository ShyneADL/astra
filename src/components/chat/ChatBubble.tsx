import { User, Bot, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import TypingIndicator from "./TypingIndicator";
import StreamingText from "./StreamingText";

interface ChatBubbleProps {
  message: string;
  isUser: boolean;
  timestamp: Date;
  isStreaming?: boolean;
  failed?: boolean;
  messageId?: string;
  onRetry?: (messageId: string) => void;
}

function ChatBubble({
  message,
  isUser,
  timestamp,
  isStreaming = false,
  failed = false,
  messageId,
  onRetry,
}: ChatBubbleProps) {
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
            <User className="text-muted-foreground h-4 w-4" />
          ) : (
            <Bot className="text-muted-foreground h-4 w-4" />
          )}
        </div>

        <div className="flex flex-col">
          <div
            className={cn(
              "rounded-2xl px-4 py-2 shadow-sm",
              isUser
                ? "bg-primary text-white rounded-tr-none"
                : "border-border bg-card text-card-foreground rounded-tl-none border"
            )}
          >
            {isUser ? (
              <p className="whitespace-pre-wrap">{message}</p>
            ) : (
              <>
                {message ? (
                  <StreamingText text={message} isStreaming={isStreaming} />
                ) : (
                  isStreaming && <TypingIndicator isVisible={true} />
                )}
              </>
            )}
          </div>

          {failed && isUser && onRetry && messageId && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onRetry(messageId)}
              className="mt-1 h-8 w-fit self-end hover:!bg-transparent text-xs text-gray-500 hover:text-gray-700"
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Retry
            </Button>
          )}

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

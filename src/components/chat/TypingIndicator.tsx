interface TypingIndicatorProps {
  isVisible: boolean;
}

export default function TypingIndicator({ isVisible }: TypingIndicatorProps) {
  if (!isVisible) return null;

  return (
    <span className="inline-flex items-center text-muted-foreground space-x-1">
      <span
        className="inline-block w-2 h-2 rounded-full bg-current typing-pulse"
        style={{ animationDelay: "0ms" }}
      />
      <span
        className="inline-block w-2 h-2 rounded-full bg-current typing-pulse"
        style={{ animationDelay: "200ms" }}
      />
      <span
        className="inline-block w-2 h-2 rounded-full bg-current typing-pulse"
        style={{ animationDelay: "400ms" }}
      />
    </span>
  );
}

import { useEffect, useState } from "react";

interface TypingIndicatorProps {
  isVisible: boolean;
}

export default function TypingIndicator({ isVisible }: TypingIndicatorProps) {
  const [dots, setDots] = useState("●");
  const [animationPhase, setAnimationPhase] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "●") return "●●";
        if (prev === "●●") return "●●●";
        return "●";
      });

      setAnimationPhase((prev) => (prev + 1) % 3);
    }, 400);

    return () => clearInterval(interval);
  }, [isVisible]);

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

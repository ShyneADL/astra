import { useEffect, useState } from "react";

interface TypingIndicatorProps {
  isVisible: boolean;
}

export default function TypingIndicator({ isVisible }: TypingIndicatorProps) {
  const [dots, setDots] = useState("●");

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setDots((prev) => {
        if (prev === "●") return "●●";
        if (prev === "●●") return "●●●";
        return "●";
      });
    }, 500);

    return () => clearInterval(interval);
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <span className="inline-flex items-center text-muted-foreground">
      <span className="animate-pulse">{dots}</span>
    </span>
  );
}

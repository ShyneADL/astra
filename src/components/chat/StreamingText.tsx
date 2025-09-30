import { useEffect, useState, useRef } from "react";

interface StreamingTextProps {
  text: string;
  isStreaming?: boolean;
}

export default function StreamingText({
  text,
  isStreaming = false,
}: StreamingTextProps) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    setDisplayText(text);
  }, [text]);

  return (
    <span className="font-Sans whitespace-pre-wrap">
      {displayText}
      {isStreaming && <span className="cursor-blink text-primary">|</span>}
    </span>
  );
}

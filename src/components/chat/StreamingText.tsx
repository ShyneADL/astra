import { useEffect, useState } from "react";

interface StreamingTextProps {
  text: string;
}

export default function StreamingText({ text }: StreamingTextProps) {
  const [displayText, setDisplayText] = useState("");

  useEffect(() => {
    setDisplayText(text);
  }, [text]);

  return <span className="whitespace-pre-wrap">{displayText}</span>;
}

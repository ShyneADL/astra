"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Mic, Square } from "lucide-react";
import { useConversation } from "@elevenlabs/react";
import { cn } from "@/lib/utils";

export default function VoiceChat() {
  type CallStatus = "idle" | "connecting" | "in_call" | "error";

  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<CallStatus>("idle");

  const conversation = useConversation({
    preferHeadphonesForIosDevices: true,
    onConnect: () => {
      setCallStatus("in_call");
      setIsCalling(true);
    },
    onDisconnect: () => {
      setIsCalling(false);
      setCallStatus("idle");
    },
    onError: () => {
      setCallStatus("error");
    },
    onMessage: (_msg) => {
      // Optional: handle transcriptions or agent messages here
    },
  });

  async function startCall() {
    if (isCalling) return;
    setCallStatus("connecting");

    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setCallStatus("error");
      return;
    }

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      const userId = user?.id ?? "anonymous";

      await conversation.startSession({
        agentId: "agent_0101k32388bjfya8zreq24bbeybb",
        userId,
        connectionType: "webrtc",
      });
    } catch (e) {
      console.error(e);
      setCallStatus("error");
      await endCall();
    }
  }

  async function endCall() {
    try {
      await (conversation as any).endSession?.();
      await (conversation as any).stopSession?.();
      await (conversation as any).disconnect?.();
    } finally {
      setIsCalling(false);
      setCallStatus("idle");
    }
  }

  const toggleCall = () => {
    if (isCalling) endCall();
    else startCall();
  };

  useEffect(() => {
    return () => {
      endCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-full w-full flex-col items-center justify-center">
      <div className="relative mb-12">
        <img
          src="/logo-large.png"
          alt="AI Assistant"
          className="h-32 w-32 rounded-full object-cover shadow-lg"
        />

        {/* Audio Visualizer Rings */}
        <div
          className={cn(
            "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2",
            "pointer-events-none"
          )}
        >
          {isCalling && (
            <>
              <div className="absolute h-40 w-40 animate-ping rounded-full border border-primary/60" />
              <div className="absolute h-44 w-44 animate-ping rounded-full border border-primary/50 animation-delay-200" />
              <div className="absolute h-48 w-48 animate-ping rounded-full border border-primary/40 animation-delay-400" />
            </>
          )}
        </div>

        {/* Status Indicator */}
        <div
          className={cn(
            "absolute -bottom-2 right-0 h-4 w-4 rounded-full border-2 border-white",
            callStatus === "idle" && "bg-gray-400",
            callStatus === "connecting" && "bg-yellow-400",
            callStatus === "in_call" && "bg-green-400",
            callStatus === "error" && "bg-red-400"
          )}
        />
      </div>

      {/* Status Text */}
      <p className="mb-8 text-sm font-medium text-gray-600">
        {callStatus === "idle" && "Ready to talk"}
        {callStatus === "connecting" && "Connecting..."}
        {callStatus === "in_call" && "Listening..."}
        {callStatus === "error" && "Something went wrong"}
      </p>

      {/* Control Button */}
      <Button
        onClick={toggleCall}
        size="lg"
        variant={isCalling ? "destructive" : "default"}
        className={cn(
          "h-16 w-16 rounded-full p-0 transition-all duration-300 cursor-pointer shadow-lg hover:shadow-sm",
          isCalling
            ? "bg-red-500 hover:bg-red-600"
            : "bg-white hover:bg-white/90",
          callStatus === "connecting" && "animate-pulse"
        )}
      >
        {isCalling ? (
          <Square className="h-6 w-6" />
        ) : (
          <Mic className="h-6 w-6 text-black" />
        )}
      </Button>
    </div>
  );
}

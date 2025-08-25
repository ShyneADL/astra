"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { Phone, PhoneOff } from "lucide-react";
import {useConversation} from '@elevenlabs/react'

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
    // You can pass overrides or clientTools here if needed
    // overrides: { agent: { language: "en" } }
    // clientTools: { /* tools exposed in ElevenLabs UI */ }
  });

  async function startCall() {
    if (isCalling) return;
    setCallStatus("connecting");

    try {
      // Prompt for mic access before starting the session
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      setCallStatus("error");
      return;
    }

    try {
      // Get the authenticated user's id from Supabase
      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? "anonymous";

      await conversation.startSession({
        agentId: "agent_0101k32388bjfya8zreq24bbeybb",
        userId,
        connectionType: "webrtc",
      });
      // onConnect will flip isCalling and callStatus when connected
    } catch (e) {
      console.error(e);
      setCallStatus("error");
      // Best-effort cleanup
      await endCall();
    }
  }

  async function endCall() {
    try {
      // The SDK provides connection management; attempt common session termination methods.
      // Optional chaining with 'as any' avoids type errors if a method doesn't exist.
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      endCall();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between rounded-lg border p-4">
        <div className="flex flex-col">
          <span className="text-sm font-medium">Voice Agent</span>
          <span className="text-xs text-muted-foreground">
            {callStatus === "idle" && "Idle"}
            {callStatus === "connecting" && "Connecting..."}
            {callStatus === "in_call" && "In call"}
            {callStatus === "error" && "Call error — try again"}
          </span>
        </div>

        <Button
          type="button"
          size="sm"
          variant={isCalling ? "destructive" : "default"}
          onClick={toggleCall}
          title={isCalling ? "End Call" : "Start Call"}
        >
          {isCalling ? (
            <div className="flex items-center gap-2">
              <PhoneOff className="h-4 w-4" />
              End Call
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4" />
              Start Call
            </div>
          )}
        </Button>
      </div>
    </div>
  );
}
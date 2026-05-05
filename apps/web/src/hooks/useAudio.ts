"use client";

import { useCallback, useRef, useState } from "react";

export type AudioState = "idle" | "loading" | "playing" | "error";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export function useAudio() {
  const [state, setState] = useState<AudioState>("idle");
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentKeyRef = useRef<string | null>(null);

  const speak = useCallback(
    async (text: string, key: string) => {
      // If the same card is already playing, stop it (toggle off).
      if (currentKeyRef.current === key && state === "playing") {
        audioRef.current?.pause();
        audioRef.current = null;
        currentKeyRef.current = null;
        setState("idle");
        return;
      }

      // Stop any currently playing audio before starting new one.
      audioRef.current?.pause();
      audioRef.current = null;
      currentKeyRef.current = key;
      setState("loading");

      try {
        const response = await fetch(`${API_BASE}/api/v1/speak`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });

        if (!response.ok) {
          throw new Error("TTS request failed");
        }

        // Convert the streaming audio response to a blob URL so the
        // browser's Audio API can play it. We wait for full download
        // here because HTMLAudioElement needs a seekable source.
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audioRef.current = audio;

        audio.onended = () => {
          URL.revokeObjectURL(url);
          setState("idle");
          currentKeyRef.current = null;
        };

        audio.onerror = () => {
          setState("error");
          currentKeyRef.current = null;
        };

        await audio.play();
        setState("playing");
      } catch {
        setState("error");
        currentKeyRef.current = null;
      }
    },
    [state],
  );

  const stop = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    currentKeyRef.current = null;
    setState("idle");
  }, []);

  return { speak, stop, state, currentKey: currentKeyRef.current };
}

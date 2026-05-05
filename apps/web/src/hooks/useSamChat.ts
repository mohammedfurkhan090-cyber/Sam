"use client";

import { useCallback, useRef, useState } from "react";
import { parsePartialJson } from "@/lib/parsePartialJson";

type ToolName = "unfold" | "search" | "none";
type StreamingState = "idle" | "routing" | "streaming" | "done";

export type SamChatOutput = {
  summary?: string;
  keyPoints?: string[];
  blindSpots?: string[];
  questions?: string[];
  chat?: string;
};

type ChatEvent =
  | { type: "routing"; payload: { tool: ToolName } }
  | { type: "token"; payload: { text?: string } }
  | { type: "reply"; payload: { text?: string } }
  | { type: "error"; payload: { message?: string } }
  | { type: "done"; payload: null }
  | { type: string; payload: unknown };

const API_URL = "http://localhost:4000/api/v1/chat";

export function useSamChat() {
  const [output, setOutput] = useState<SamChatOutput>({});
  const [streamingState, setStreamingState] = useState<StreamingState>("idle");
  const [currentTool, setCurrentTool] = useState<ToolName | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const submit = useCallback(async (message: string): Promise<SamChatOutput | null> => {
    const trimmed = message.trim();
    if (!trimmed) {
      setError("Message cannot be empty");
      return null;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setError(null);
    setOutput({});
    setCurrentTool(null);
    setStreamingState("routing");

    let thinkingText = "";
    let chatText = "";
    let latestOutput: SamChatOutput = {};
    let sawDone = false;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      if (!response.body) {
        throw new Error("Streaming response body is unavailable");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      const processBlock = (block: string) => {
        const lines = block.split(/\r?\n/);
        const dataLines = lines.filter((line) => line.startsWith("data:"));
        if (dataLines.length === 0) {
          return;
        }

        const rawData = dataLines
          .map((line) => line.slice(line.indexOf("data:") + 5).trim())
          .join("\n");

        if (rawData === "[DONE]") {
          sawDone = true;
          setStreamingState("done");
          return;
        }

        let event: ChatEvent;
        try {
          event = JSON.parse(rawData) as ChatEvent;
        } catch {
          return;
        }

        if (event.type === "routing") {
          const tool = event.payload?.tool;
          if (tool === "unfold" || tool === "search" || tool === "none") {
            setCurrentTool(tool);
          }
        } else if (event.type === "token") {
          const token = event.payload?.text ?? "";
          thinkingText += token;
          const partial = parsePartialJson(thinkingText);
          latestOutput = {
            ...latestOutput,
            summary: partial.summary ?? latestOutput.summary,
            keyPoints: partial.keyPoints ?? latestOutput.keyPoints,
            blindSpots: partial.blindSpots ?? latestOutput.blindSpots,
            questions: partial.questions ?? latestOutput.questions,
          };
          setOutput(latestOutput);
          setStreamingState("streaming");
        } else if (event.type === "reply") {
          const token = event.payload?.text ?? "";
          chatText += token;
          latestOutput = { ...latestOutput, chat: chatText };
          setOutput(latestOutput);
          setStreamingState("streaming");
        } else if (event.type === "error") {
          setError(event.payload?.message ?? "Streaming failed");
        } else if (event.type === "done") {
          sawDone = true;
          setStreamingState("done");
        }
      };

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(/\r?\n\r?\n/);
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          processBlock(part);
        }
      }

      if (buffer.trim()) {
        processBlock(buffer);
      }

      if (sawDone) {
        setStreamingState("done");
        setTimeout(() => setStreamingState("idle"), 500);
      } else {
        setStreamingState("idle");
      }

      return latestOutput;
    } catch (errorValue) {
      if (controller.signal.aborted) {
        return null;
      }

      const message = errorValue instanceof Error ? errorValue.message : "Streaming failed";
      setError(message);
      setStreamingState("idle");
      return null;
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
    }
  }, []);

  return {
    submit,
    output,
    streamingState,
    currentTool,
    error,
  };
}

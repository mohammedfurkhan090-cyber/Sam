"use client";

import { useCallback, useRef, useState } from "react";
import { parsePartialJson } from "@/lib/parsePartialJson";

type ToolName = "unfold" | "search" | "code" | "image" | "slides" | "speak" | "rag" | "agent" | "none";
type StreamingState = "idle" | "routing" | "streaming" | "done";

export type SamChatOutput = {
  summary?: string;
  keyPoints?: string[];
  blindSpots?: string[];
  questions?: string[];
  chat?: string;
  codeText?: string;
  imageUrl?: string;
  slidesUrl?: string;
  agentSteps?: string[];
};

type SamMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  tool: "unfold" | "search" | "code" | "image" | "slides" | "speak" | "rag" | "agent" | "none" | null;
  output: SamChatOutput;
  timestamp: Date;
};

type ChatEvent =
  | { type: "image"; payload: { url: string } }
  | { type: "slides"; payload: { url: string } }
  | { type: "routing"; payload: { tool: string } }
  | { type: "token"; payload: { text?: string } }
  | { type: "reply"; payload: { text?: string } }
  | { type: "error"; payload: { message?: string } }
  | { type: "done"; payload: null }
  | { type: string; payload: unknown };

const API_URL = "http://localhost:4000/api/v1/chat";

export function useSamChat() {
  const [messages, setMessages] = useState<SamMessage[]>([]);
  const [output, setOutput] = useState<SamChatOutput>({});
  const [streamingState, setStreamingState] = useState<StreamingState>("idle");
  const [currentTool, setCurrentTool] = useState<ToolName | null>(null);
  const clearMessages = useCallback(() => setMessages([]), []);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const submit = useCallback(async (message: string, activeTools?: Record<string, boolean>): Promise<SamChatOutput | null> => {
    const trimmed = message.trim();
    if (!trimmed) {
      setError("Message cannot be empty");
      return null;
    }

    const userMessage: SamMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      tool: null,
      output: {},
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    const history = messages.slice(-6).map((m) => ({
      role: m.role,
      content: m.role === "user" ? m.content : m.output.chat ?? m.output.summary ?? "",
    }));

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
    let resolvedTool: ToolName | null = null;

    try {
      const response = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history, activeTools }),
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
          const payload = event.payload as { tool?: string };
          const tool = payload.tool;
          if (tool) {
            resolvedTool = tool as ToolName;
            setCurrentTool(tool as ToolName);
          }
        } else if (event.type === "token") {
          const payload = event.payload as { text?: string };
          const token = payload.text ?? "";
          if (resolvedTool === "unfold") {
            thinkingText += token;
            try {
              const partial = parsePartialJson(thinkingText);
              latestOutput = {
                ...latestOutput,
                summary: partial.summary ?? latestOutput.summary,
                keyPoints: partial.keyPoints ?? latestOutput.keyPoints,
                blindSpots: partial.blindSpots ?? latestOutput.blindSpots,
                questions: partial.questions ?? latestOutput.questions,
              };
            } catch {
              return;
            }
          } else {
            chatText += token;
            latestOutput = { ...latestOutput, chat: chatText };
          }
          setOutput(latestOutput);
          setStreamingState("streaming");
        } else if (event.type === "reply") {
          const payload = event.payload as { text?: string };
          const token = payload.text ?? "";
          chatText += token;
          if (resolvedTool === "agent") {
            const agentSteps = [...(latestOutput.agentSteps ?? []), token];
            latestOutput = { ...latestOutput, agentSteps, chat: agentSteps[agentSteps.length - 1] ?? chatText };
          } else {
            latestOutput = { ...latestOutput, chat: chatText };
          }
          setOutput(latestOutput);
          setStreamingState("streaming");
        } else if (event.type === "image") {
          const payload = event.payload as { url?: string };
          latestOutput = { ...latestOutput, imageUrl: payload.url };
          setOutput({ ...latestOutput });
          setStreamingState("streaming");
        } else if (event.type === "slides") {
          const payload = event.payload as { url?: string };
          latestOutput = { ...latestOutput, slidesUrl: payload.url };
          setOutput(latestOutput);
          setStreamingState("streaming");
        } else if (event.type === "error") {
          const payload = event.payload as { tool?: string; output?: { chat?: string } };
          setError(payload.output?.chat ?? "Streaming failed");
          setMessages((prev) => [
            ...prev,
            {
              id: crypto.randomUUID(),
              role: "assistant",
              content: payload.output?.chat ?? "An error occurred.",
              tool: (payload.tool as ToolName) ?? "none",
              output: payload.output ?? {},
              timestamp: new Date(),
            },
          ]);
          setStreamingState("idle");
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
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: latestOutput.chat ?? latestOutput.summary ?? "",
            tool: resolvedTool ?? "none",
            output: latestOutput,
            timestamp: new Date(),
          },
        ]);
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
  }, [messages]);

  return {
    submit,
    messages,
    output,
    streamingState,
    currentTool,
    error,
    clearMessages,
  };
}

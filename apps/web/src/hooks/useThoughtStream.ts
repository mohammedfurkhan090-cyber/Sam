"use client";

import { useCallback, useRef, useState } from "react";
import { parsePartialJson, type ParsedBreakdown, type PartialBreakdown } from "@/lib/parsePartialJson";
import { streamUnfold } from "@/lib/stream";
import type { ThoughtMode } from "@/lib/prompts";

export type StreamResult = {
  mode: ThoughtMode;
  raw: string;
  breakdown: ParsedBreakdown;
};

const emptyBreakdown: ParsedBreakdown = {
  summary: "",
  keyPoints: [],
  expansions: [],
  blindSpots: [],
  questions: [],
};

export function useThoughtStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState("");
  const [rawStreamText, setRawStreamText] = useState("");
  const [breakdown, setBreakdown] = useState<ParsedBreakdown>(emptyBreakdown);

  const abortRef = useRef<AbortController | null>(null);

  const startStream = useCallback(async (thought: string, mode: ThoughtMode): Promise<StreamResult | null> => {
    const trimmedThought = thought.trim();
    if (!trimmedThought) {
      setError("Thought cannot be empty.");
      return null;
    }

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsStreaming(true);
    setError("");
    setRawStreamText("");
    setBreakdown(emptyBreakdown);

    let aggregate = "";

    try {
      await streamUnfold({
        thought: trimmedThought,
        mode,
        signal: controller.signal,
        onToken: (token) => {
          aggregate += token;
          setRawStreamText(aggregate);

          const partial = parsePartialJson(aggregate);
          setBreakdown((previous) => mergeBreakdown(previous, partial, mode));
        },
        onDone: () => {
          // The stream utility handles [DONE]; finalization happens in this function.
        },
      });

      const finalPartial = parsePartialJson(aggregate);
      const finalBreakdown = mergeBreakdown(emptyBreakdown, finalPartial, mode);
      setBreakdown(finalBreakdown);

      return {
        mode,
        raw: aggregate,
        breakdown: finalBreakdown,
      };
    } catch (streamError) {
      if (controller.signal.aborted) {
        return null;
      }

      const message = streamError instanceof Error ? streamError.message : "Streaming failed";
      setError(message);
      return null;
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setIsStreaming(false);
    }
  }, []);

  const stopStream = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const loadBreakdown = useCallback((next: ParsedBreakdown) => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setError("");
    setRawStreamText("");
    setBreakdown(next);
  }, []);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
    setError("");
    setRawStreamText("");
    setBreakdown(emptyBreakdown);
  }, []);

  return {
    isStreaming,
    error,
    rawStreamText,
    breakdown,
    startStream,
    stopStream,
    loadBreakdown,
    reset,
  };
}

function mergeBreakdown(base: ParsedBreakdown, partial: PartialBreakdown, mode: ThoughtMode): ParsedBreakdown {
  return {
    summary: partial.summary ?? base.summary,
    keyPoints: mode === "expand" ? [] : partial.keyPoints ?? base.keyPoints,
    expansions: mode === "expand" ? partial.expansions ?? base.expansions : [],
    blindSpots: partial.blindSpots ?? base.blindSpots,
    questions: partial.questions ?? base.questions,
  };
}

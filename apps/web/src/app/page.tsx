"use client";

import { useEffect, useState } from "react";
import { BreakdownPanel } from "@/components/BreakdownPanel";
import { ExportButton } from "@/components/ExportButton";
import { HistorySidebar, type ThoughtHistoryItem } from "@/components/HistorySidebar";
import { ThoughtInput } from "@/components/ThoughtInput";
import { useThoughtStream } from "@/hooks/useThoughtStream";
import type { ParsedBreakdown } from "@/lib/parsePartialJson";
import type { ThoughtMode } from "@/lib/prompts";

const historyStorageKey = "unfold.history.v1";

const emptyBreakdown: ParsedBreakdown = {
  summary: "",
  keyPoints: [],
  expansions: [],
  blindSpots: [],
  questions: [],
};

export default function HomePage() {
  const [thought, setThought] = useState("");
  const [draftPreview, setDraftPreview] = useState("");
  const [mode, setMode] = useState<ThoughtMode>("structure");
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const [history, setHistory] = useState<ThoughtHistoryItem[]>([]);

  const { breakdown, rawStreamText, error, isStreaming, startStream, stopStream, loadBreakdown } = useThoughtStream();

  useEffect(() => {
    setHistory(readHistory());
  }, []);

  const hasBreakdown =
    breakdown.summary.length > 0 ||
    breakdown.keyPoints.length > 0 ||
    breakdown.expansions.length > 0 ||
    breakdown.blindSpots.length > 0 ||
    breakdown.questions.length > 0;

  async function handleSubmit() {
    const result = await startStream(thought, mode);
    if (!result) {
      return;
    }

    const item: ThoughtHistoryItem = {
      id: `${Date.now()}`,
      thought: thought.trim(),
      mode,
      createdAt: new Date().toISOString(),
      breakdown: result.breakdown,
    };

    const nextHistory = [item, ...history].slice(0, 30);
    setHistory(nextHistory);
    writeHistory(nextHistory);
    setActiveHistoryId(item.id);
  }

  function handleSelectHistory(item: ThoughtHistoryItem) {
    setThought(item.thought);
    setMode(item.mode);
    setActiveHistoryId(item.id);
    setDraftPreview(item.thought);
    loadBreakdown(item.breakdown);
  }

  function handleClearHistory() {
    setHistory([]);
    writeHistory([]);
    setActiveHistoryId(null);
    loadBreakdown(emptyBreakdown);
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-[1320px] px-4 py-6 md:px-6 md:py-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-zinc-500">Unfold</p>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">Real-Time Thinking Partner</h1>
        </div>
        {hasBreakdown ? <ExportButton thought={thought} mode={mode} breakdown={breakdown} /> : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        <HistorySidebar
          items={history}
          activeId={activeHistoryId}
          draftPreview={draftPreview}
          onSelect={handleSelectHistory}
          onClear={handleClearHistory}
        />

        <section className="space-y-5">
          <ThoughtInput
            thought={thought}
            mode={mode}
            isStreaming={isStreaming}
            onThoughtChange={setThought}
            onModeChange={setMode}
            onDebouncedThoughtChange={setDraftPreview}
            onSubmit={handleSubmit}
            onStop={stopStream}
          />

          {error ? <p className="rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

          <BreakdownPanel mode={mode} isStreaming={isStreaming} breakdown={breakdown} />

          {process.env.NODE_ENV === "development" && rawStreamText ? (
            <details className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-3">
              <summary className="cursor-pointer text-xs uppercase tracking-wide text-zinc-400">Raw stream text</summary>
              <pre className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap text-xs text-zinc-500">{rawStreamText}</pre>
            </details>
          ) : null}
        </section>
      </div>
    </main>
  );
}

function readHistory(): ThoughtHistoryItem[] {
  // Next.js may render client components on the server first. Guarding window
  // prevents localStorage access errors during that pre-render phase.
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(historyStorageKey);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as ThoughtHistoryItem[];
  } catch {
    return [];
  }
}

function writeHistory(items: ThoughtHistoryItem[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(historyStorageKey, JSON.stringify(items));
}

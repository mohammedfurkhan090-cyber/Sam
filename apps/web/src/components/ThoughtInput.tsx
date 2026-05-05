"use client";

import { useRef } from "react";
import type { ThoughtMode } from "@/lib/prompts";
import { modeHelperText, modeOptions, modePlaceholder } from "@/lib/prompts";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type ThoughtInputProps = {
  thought: string;
  mode: ThoughtMode;
  isStreaming: boolean;
  onThoughtChange: (next: string) => void;
  onModeChange: (next: ThoughtMode) => void;
  onDebouncedThoughtChange: (next: string) => void;
  onSubmit: () => void;
  onStop: () => void;
};

export function ThoughtInput({
  thought,
  mode,
  isStreaming,
  onThoughtChange,
  onModeChange,
  onDebouncedThoughtChange,
  onSubmit,
  onStop,
}: ThoughtInputProps) {
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleThoughtChange(next: string) {
    onThoughtChange(next);

    // Debounce protects side-effects (like draft persistence) from firing on
    // every keystroke, but we never debounce streamed output tokens because
    // that would make the "thinking live" experience feel laggy and fake.
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      onDebouncedThoughtChange(next);
    }, 220);
  }

  return (
    <section className="rounded-2xl border border-zinc-800 bg-zinc-950/70 p-5">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <label className="text-xs uppercase tracking-wide text-zinc-400">Mode</label>
        <select
          value={mode}
          onChange={(event) => onModeChange(event.target.value as ThoughtMode)}
          className="rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-[#7c6fe0]"
        >
          {modeOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <span className="text-xs text-zinc-500">{modeHelperText(mode)}</span>
      </div>

      <Textarea
        value={thought}
        onChange={(event) => handleThoughtChange(event.target.value)}
        onKeyDown={(event) => {
          if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
            event.preventDefault();
            onSubmit();
          }
        }}
        rows={7}
        placeholder={modePlaceholder(mode)}
        className="font-mono text-base leading-relaxed"
      />

      <p className={`mt-1 text-right text-xs ${thought.length > 1800 ? "text-amber-400" : "text-zinc-600"}`}>
        {thought.length}/2000
      </p>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-zinc-500">Shortcut: Ctrl/Cmd + Enter</p>
        <div className="flex items-center gap-2">
          {isStreaming ? (
            <Button variant="outline" onClick={onStop}>
              Stop Stream
            </Button>
          ) : null}
          <Button onClick={onSubmit} disabled={isStreaming || thought.trim().length === 0}>
            {isStreaming ? "Streaming..." : "Unfold Thought"}
          </Button>
        </div>
      </div>
    </section>
  );
}

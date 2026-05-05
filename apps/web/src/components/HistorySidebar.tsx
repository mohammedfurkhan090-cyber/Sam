"use client";

import type { ThoughtMode } from "@/lib/prompts";
import { Button } from "@/components/ui/button";

export type ThoughtHistoryItem = {
  id: string;
  thought: string;
  mode: ThoughtMode;
  createdAt: string;
  breakdown: {
    summary: string;
    keyPoints: string[];
    expansions: string[];
    blindSpots: string[];
    questions: string[];
  };
};

type HistorySidebarProps = {
  items: ThoughtHistoryItem[];
  activeId: string | null;
  draftPreview: string;
  onSelect: (item: ThoughtHistoryItem) => void;
  onClear: () => void;
};

export function HistorySidebar({ items, activeId, draftPreview, onSelect, onClear }: HistorySidebarProps) {
  return (
    <aside className="h-full rounded-2xl border border-zinc-800 bg-zinc-950/70 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs uppercase tracking-wide text-zinc-400">History</h2>
        <Button size="sm" variant="ghost" onClick={onClear} disabled={items.length === 0}>
          Clear
        </Button>
      </div>

      {draftPreview.trim() ? (
        <div className="mb-3 rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-xs text-zinc-400">
          Draft: {truncate(draftPreview, 60)}
        </div>
      ) : null}

      <div className="space-y-2">
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500">No saved thoughts yet.</p>
        ) : null}

        {items.map((item) => (
          <button
            key={item.id}
            onClick={() => onSelect(item)}
            className={`w-full rounded-lg border px-3 py-2 text-left transition ${
              item.id === activeId
                ? "border-[#7c6fe0]/60 bg-[#7c6fe0]/10"
                : "border-zinc-800 bg-zinc-900/60 hover:border-zinc-700"
            }`}
          >
            <p className="line-clamp-2 text-sm text-zinc-100">{truncate(item.thought, 60)}</p>
            <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">{item.mode}</p>
          </button>
        ))}
      </div>
    </aside>
  );
}

function truncate(value: string, length: number): string {
  if (value.length <= length) {
    return value;
  }
  return `${value.slice(0, length)}...`;
}

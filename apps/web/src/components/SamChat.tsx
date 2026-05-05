"use client";

import { useMemo, useState } from "react";
import { Brain, BookOpen, Code, Coffee, GitBranch, Lightbulb, Loader2, PenTool, Presentation, Send, Sparkles } from "lucide-react";
import { useSamChat, type RouterDecision } from "@/hooks/useSamChat";

type ToolName = "unfold" | "speak" | "search" | "none";
type AssistantMode = "daily" | "studying" | "mindmap" | "slides" | "coding" | "brainstorm" | "writing";

type Breakdown = {
  summary: string;
  keyPoints: string[];
  blindSpots: string[];
  questions: string[];
};

type ChatRecord = {
  id: string;
  input: string;
  tool: ToolName;
  decision?: RouterDecision;
  replyText?: string;
  breakdown?: Breakdown;
  createdAt: number;
};

const modeConfig: Record<
  AssistantMode,
  { icon: typeof Coffee; label: string; description: string; color: string; placeholder: string; suggestions: string[] }
> = {
  daily: {
    icon: Coffee,
    label: "Daily",
    description: "Casual chat & assistance",
    color: "#ec4899",
    placeholder: "What's on your mind?",
    suggestions: ["Plan my day", "Give me motivation", "Recipe ideas"],
  },
  studying: {
    icon: BookOpen,
    label: "Study",
    description: "Learn & understand concepts",
    color: "#10b981",
    placeholder: "What would you like to learn?",
    suggestions: ["Explain quantum physics", "Help with calculus", "Summarize history"],
  },
  mindmap: {
    icon: GitBranch,
    label: "Mind Map",
    description: "Visualize ideas & connections",
    color: "#8b5cf6",
    placeholder: "What would you like to map out?",
    suggestions: ["Map my project", "Organize ideas", "Plan my thesis"],
  },
  slides: {
    icon: Presentation,
    label: "Slides",
    description: "Create presentations",
    color: "#f59e0b",
    placeholder: "What presentation do you need?",
    suggestions: ["Pitch deck", "Quarterly review", "Project proposal"],
  },
  coding: {
    icon: Code,
    label: "Code",
    description: "Programming help",
    color: "#06b6d4",
    placeholder: "What are you building?",
    suggestions: ["Debug React", "Explain async", "SQL help"],
  },
  brainstorm: {
    icon: Lightbulb,
    label: "Ideas",
    description: "Generate creative ideas",
    color: "#f97316",
    placeholder: "What would you like to brainstorm?",
    suggestions: ["Business ideas", "Marketing strategy", "Product features"],
  },
  writing: {
    icon: PenTool,
    label: "Write",
    description: "Content & copywriting",
    color: "#a855f7",
    placeholder: "What would you like to write?",
    suggestions: ["Blog intro", "Email draft", "Social caption"],
  },
};

export function SamChat() {
  const [message, setMessage] = useState("");
  const [records, setRecords] = useState<ChatRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedMode, setSelectedMode] = useState<AssistantMode>("daily");
  const { isStreaming, isDone, error, routing, replyText, thinking, startChat } = useSamChat();

  const activeRecord = useMemo(() => records.find((r) => r.id === activeId) ?? null, [records, activeId]);

  async function onSubmit() {
    const trimmed = message.trim();
    if (!trimmed || isStreaming) return;

    const id = crypto.randomUUID();
    const draft: ChatRecord = { id, input: trimmed, tool: "none", createdAt: Date.now() };
    setRecords((prev) => [draft, ...prev]);
    setActiveId(id);
    setMessage("");

    const result = await startChat(trimmed);
    if (!result) return;

    const finalTool = result.decision?.tool ?? "none";
    setRecords((prev) =>
      prev.map((r) =>
        r.id === id
          ? {
              ...r,
              tool: finalTool,
              decision: result.decision ?? undefined,
              replyText: finalTool === "none" || finalTool === "speak" || finalTool === "search" ? result.replyText : undefined,
              breakdown:
                finalTool === "unfold"
                  ? {
                      summary: result.thinking.summary,
                      keyPoints: result.thinking.keyPoints,
                      blindSpots: result.thinking.blindSpots,
                      questions: result.thinking.questions,
                    }
                  : undefined,
            }
          : r,
      ),
    );
  }

  const showTool = isStreaming ? routing?.tool : activeRecord?.tool;
  const showDecision = isStreaming ? routing : activeRecord?.decision;
  const mode = modeConfig[selectedMode];
  const modeEntries = Object.entries(modeConfig) as [AssistantMode, (typeof modeConfig)[AssistantMode]][];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl gap-5 px-4 py-6 md:px-6">
      <aside className="hidden w-72 shrink-0 rounded-2xl border border-[var(--sam-border)] bg-[var(--sam-sidebar)]/75 p-3 lg:block">
        <div className="mb-2 flex items-center gap-2 px-2 text-sm text-[var(--sam-text-secondary)]">
          <Sparkles className="h-4 w-4 text-[var(--sam-accent)]" />
          Recent
        </div>
        <div className="sam-scrollbar max-h-[80vh] space-y-2 overflow-auto">
          {records.length === 0 ? (
            <p className="rounded-xl border border-[var(--sam-border)] bg-[var(--sam-card)] p-3 text-xs text-[var(--sam-text-faint)]">
              No conversation history yet.
            </p>
          ) : null}
          {records.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveId(item.id)}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm transition ${
                item.id === activeId
                  ? "border border-[var(--sam-accent)]/40 bg-[var(--sam-accent)]/10 text-[var(--sam-text-primary)]"
                  : "border border-[var(--sam-border)] bg-[var(--sam-card)] text-[var(--sam-text-secondary)] hover:border-[var(--sam-border-hover)]"
              }`}
            >
              <div className="truncate">{item.input}</div>
              <div className="mt-1 text-xs text-[var(--sam-text-faint)]">{item.tool}</div>
            </button>
          ))}
        </div>
      </aside>

      <section className="flex min-w-0 flex-1 flex-col gap-4">
        <header className="flex items-center justify-between rounded-2xl border border-[var(--sam-border)] bg-[var(--sam-card)]/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[var(--sam-accent)]" />
            <div>
              <h1 className="text-sm font-semibold text-[var(--sam-text-primary)] md:text-base">Sam</h1>
              <p className="text-xs text-[var(--sam-text-secondary)]">Think clearer, act faster.</p>
            </div>
          </div>
          <div className="rounded-full border border-[var(--sam-border)] px-3 py-1 text-xs text-[var(--sam-text-secondary)]">
            {isStreaming ? "Streaming" : isDone ? "Done" : "Ready"}
          </div>
        </header>

        <div className="rounded-3xl border border-[var(--sam-border)] bg-[var(--sam-prompt-bg)] p-4">
          <div className="mb-4 flex flex-wrap items-center gap-2 border-b border-[var(--sam-border)] pb-3">
            {modeEntries.map(([modeKey, cfg]) => {
              const ModeIcon = cfg.icon;
              const active = selectedMode === modeKey;
              return (
                <button
                  key={modeKey}
                  onClick={() => setSelectedMode(modeKey)}
                  className="rounded-full border px-3 py-1 text-xs transition"
                  style={{
                    borderColor: active ? `${cfg.color}66` : "var(--sam-border)",
                    backgroundColor: active ? `${cfg.color}1F` : "transparent",
                    color: active ? cfg.color : "var(--sam-text-secondary)",
                  }}
                >
                  <span className="inline-flex items-center gap-1.5">
                    <ModeIcon className="h-3.5 w-3.5" />
                    {cfg.label}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {modeEntries.map(([modeKey, cfg]) => {
              const ModeIcon = cfg.icon;
              const active = selectedMode === modeKey;
              return (
                <button
                  key={`${modeKey}-card`}
                  onClick={() => setSelectedMode(modeKey)}
                  className="rounded-2xl border p-3 text-left transition"
                  style={{
                    borderColor: active ? `${cfg.color}80` : "var(--sam-border)",
                    backgroundColor: active ? `${cfg.color}14` : "var(--sam-card)",
                  }}
                >
                  <div className="mb-2 inline-flex rounded-xl p-2" style={{ backgroundColor: `${cfg.color}1A` }}>
                    <ModeIcon className="h-4 w-4" style={{ color: cfg.color }} />
                  </div>
                  <p className="text-xs font-semibold text-[var(--sam-text-primary)]">{cfg.label}</p>
                  <p className="mt-1 text-[10px] text-[var(--sam-text-faint)]">{cfg.description}</p>
                </button>
              );
            })}
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            {mode.suggestions.map((s) => (
              <button
                key={s}
                onClick={() => setMessage(s)}
                className="rounded-full border border-[var(--sam-border)] bg-[var(--sam-card)] px-3 py-1 text-xs text-[var(--sam-text-secondary)] hover:border-[var(--sam-border-hover)]"
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex items-start gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 3000))}
              placeholder={mode.placeholder}
              className="min-h-20 flex-1 resize-none rounded-xl border border-[var(--sam-border)] bg-[#0b0b0b] px-3 py-2 text-sm text-[var(--sam-text-primary)] outline-none focus:border-[var(--sam-accent)]"
            />
            <button
              onClick={onSubmit}
              disabled={isStreaming || !message.trim()}
              className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--sam-accent)] text-white transition hover:bg-[var(--sam-accent-hover)] disabled:cursor-not-allowed disabled:bg-zinc-700"
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {showDecision ? (
          <div className="rounded-xl border border-[var(--sam-accent)]/40 bg-[var(--sam-accent)]/10 p-3 text-sm text-[var(--sam-text-primary)]">
            <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-[var(--sam-accent)]">
              <Brain className="h-3.5 w-3.5" />
              Routing
            </div>
            <p>
              Tool: <span className="font-semibold">{showDecision.tool}</span> ({showDecision.confidence})
            </p>
            <p className="mt-1 text-[var(--sam-text-secondary)]">{showDecision.reasoning}</p>
          </div>
        ) : null}

        {error ? <p className="rounded-xl border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-200">{error}</p> : null}

        <div className="grid gap-4 md:grid-cols-2">
          {showTool === "unfold" ? (
            <>
              <Card title="Summary" body={isStreaming ? thinking.summary : (activeRecord?.breakdown?.summary ?? "")} cursor={isStreaming} />
              <ListCard title="Key Points" items={isStreaming ? thinking.keyPoints : (activeRecord?.breakdown?.keyPoints ?? [])} />
              <ListCard title="Blind Spots" items={isStreaming ? thinking.blindSpots : (activeRecord?.breakdown?.blindSpots ?? [])} />
              <ListCard title="Questions" items={isStreaming ? thinking.questions : (activeRecord?.breakdown?.questions ?? [])} />
            </>
          ) : (
            <Card
              title="Reply"
              body={(isStreaming ? replyText : activeRecord?.replyText) || "Ask Sam to start a conversation."}
              cursor={isStreaming}
            />
          )}
        </div>
      </section>
    </main>
  );
}

function Card({ title, body, cursor = false }: { title: string; body: string; cursor?: boolean }) {
  return (
    <article className="rounded-2xl border border-[var(--sam-border)] bg-[var(--sam-card)]/70 p-4">
      <h3 className="mb-2 text-xs uppercase tracking-wide text-[var(--sam-text-muted)]">{title}</h3>
      <p className="whitespace-pre-wrap text-sm text-[var(--sam-text-primary)]">
        {body || "..."}
        {cursor ? <span className="ml-1 inline-block h-4 w-0.5 animate-pulse bg-[var(--sam-accent)] align-middle" /> : null}
      </p>
    </article>
  );
}

function ListCard({ title, items }: { title: string; items: string[] }) {
  return (
    <article className="rounded-2xl border border-[var(--sam-border)] bg-[var(--sam-card)]/70 p-4">
      <h3 className="mb-2 text-xs uppercase tracking-wide text-[var(--sam-text-muted)]">{title}</h3>
      {items.length ? (
        <ul className="space-y-2 text-sm text-[var(--sam-text-primary)]">
          {items.map((item) => (
            <li key={item} className="flex gap-2">
              <span className="text-[var(--sam-accent)]">•</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-[var(--sam-text-faint)]">...</p>
      )}
    </article>
  );
}

// @ts-nocheck
"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
    color: "#475569",
    placeholder: "What's on your mind?",
    suggestions: ["Plan my day", "Give me motivation", "Recipe ideas"],
  },
  studying: {
    icon: BookOpen,
    label: "Study",
    description: "Learn & understand concepts",
    color: "#475569",
    placeholder: "What would you like to learn?",
    suggestions: ["Explain quantum physics", "Help with calculus", "Summarize history"],
  },
  mindmap: {
    icon: GitBranch,
    label: "Mind Map",
    description: "Visualize ideas & connections",
    color: "#475569",
    placeholder: "What would you like to map out?",
    suggestions: ["Map my project", "Organize ideas", "Plan my thesis"],
  },
  slides: {
    icon: Presentation,
    label: "Slides",
    description: "Create presentations",
    color: "#475569",
    placeholder: "What presentation do you need?",
    suggestions: ["Pitch deck", "Quarterly review", "Project proposal"],
  },
  coding: {
    icon: Code,
    label: "Code",
    description: "Programming help",
    color: "#475569",
    placeholder: "What are you building?",
    suggestions: ["Debug React", "Explain async", "SQL help"],
  },
  brainstorm: {
    icon: Lightbulb,
    label: "Ideas",
    description: "Generate creative ideas",
    color: "#475569",
    placeholder: "What would you like to brainstorm?",
    suggestions: ["Business ideas", "Marketing strategy", "Product features"],
  },
  writing: {
    icon: PenTool,
    label: "Write",
    description: "Content & copywriting",
    color: "#475569",
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
              replyText: finalTool === "none" || finalTool === "speak" || finalTool === "search" ? result.replyText : undefined,
            }
          : r,
      ),
    );
  }

  return (
    <main className="mx-auto flex min-h-screen w-full flex-col gap-6 p-6 font-sans antialiased text-slate-800">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-medium tracking-tight text-slate-900">Sam</h1>
        <div className="flex items-center gap-4 text-xs font-medium uppercase tracking-widest text-slate-400">
           {isStreaming ? "Streaming..." : "Ready"}
        </div>
      </header>

      <section className="flex flex-1 flex-col gap-6">
        <div className="flex flex-col gap-8 rounded-3xl bg-slate-50 p-8 border border-slate-100">
           <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value.slice(0, 3000))}
              placeholder="How can I help you today?"
              className="w-full flex-1 resize-none bg-transparent text-2xl font-light text-slate-900 placeholder-slate-300 outline-none"
            />
            <div className="flex justify-end">
             <button
              onClick={onSubmit}
              disabled={isStreaming || !message.trim()}
              className="rounded-full bg-slate-900 px-6 py-2.5 text-sm font-medium text-white transition-all hover:bg-slate-700 active:scale-95 disabled:opacity-50"
            >
              {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send"}
            </button>
            </div>
        </div>

        <div className="flex flex-col gap-4">
          <AnimatePresence mode='popLayout'>
            {records.map((record) => (
               <motion.div
                 key={record.id}
                 initial={{ opacity: 0, y: 20 }}
                 animate={{ opacity: 1, y: 0 }}
                 exit={{ opacity: 0, scale: 0.95 }}
                 className="rounded-2xl bg-white p-6 shadow-sm border border-slate-100"
               >
                 <p className="text-lg font-light leading-relaxed text-slate-700">
                   {record.replyText || (isStreaming ? "Thinking..." : "...")}
                 </p>
               </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>
    </main>
  );
}

"use client";

import type { ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type SectionCardProps = {
  title: string;
  children: ReactNode;
  className?: string;
  speakText?: string;
  isSpeaking?: boolean;
  isLoadingAudio?: boolean;
  onSpeak?: () => void;
};

export function SectionCard({
  title,
  children,
  className,
  speakText,
  isSpeaking,
  isLoadingAudio,
  onSpeak,
}: SectionCardProps) {
  const canSpeak = Boolean(onSpeak && speakText?.trim());

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
    >
      <Card className={cn("border-zinc-800/90", className)}>
        <CardContent>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-400">{title}</h3>
            {canSpeak ? (
              <button
                onClick={onSpeak}
                className="rounded-md p-1 text-zinc-500 transition hover:text-[#bdb4ff] disabled:opacity-40"
                disabled={isLoadingAudio}
                aria-label={isSpeaking ? "Stop" : "Listen"}
              >
                {isLoadingAudio ? "..." : isSpeaking ? "■" : "▶"}
              </button>
            ) : null}
          </div>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}

export function AnimatedList({ items }: { items: string[] }) {
  return (
    <motion.ul layout className="space-y-2">
      <AnimatePresence initial={false}>
        {items.map((item, index) => (
          <motion.li
            key={index}
            layout
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
            className="rounded-lg border border-zinc-800 bg-zinc-900/70 px-3 py-2 text-sm text-zinc-200"
          >
            {item}
          </motion.li>
        ))}
      </AnimatePresence>
    </motion.ul>
  );
}

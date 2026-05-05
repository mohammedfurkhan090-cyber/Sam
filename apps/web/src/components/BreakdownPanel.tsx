"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useAudio } from "@/hooks/useAudio";
import type { ParsedBreakdown } from "@/lib/parsePartialJson";
import type { ThoughtMode } from "@/lib/prompts";
import { AnimatedList, SectionCard } from "@/components/SectionCard";

type BreakdownPanelProps = {
  mode: ThoughtMode;
  isStreaming: boolean;
  breakdown: ParsedBreakdown;
};

export function BreakdownPanel({ mode, isStreaming, breakdown }: BreakdownPanelProps) {
  const hasSummary = breakdown.summary.trim().length > 0;
  const hasSecondSection = mode === "expand" ? breakdown.expansions.length > 0 : breakdown.keyPoints.length > 0;
  const hasBlindSpots = breakdown.blindSpots.length > 0;
  const hasQuestions = breakdown.questions.length > 0;

  const hasAnyContent = hasSummary || hasSecondSection || hasBlindSpots || hasQuestions;

  const { speak, stop, state, currentKey } = useAudio();
  const prevStreamingRef = useRef(isStreaming);

  useEffect(() => {
    if (prevStreamingRef.current && !isStreaming && breakdown.summary.trim().length > 0) {
      void speak(breakdown.summary, "summary");
    }
    prevStreamingRef.current = isStreaming;
  }, [isStreaming, breakdown.summary, speak]);

  const secondLabel = mode === "expand" ? "Expansions" : "Key Points";
  const secondItems = mode === "expand" ? breakdown.expansions : breakdown.keyPoints;

  const summarySpeakText = breakdown.summary.trim();
  const secondSpeakText = secondItems.join(". ");
  const blindSpotsSpeakText = breakdown.blindSpots.join(". ");
  const questionsSpeakText = breakdown.questions.join(". ");

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm uppercase tracking-[0.16em] text-zinc-400">Live Breakdown</h2>
        {isStreaming ? (
          <span className="inline-flex items-center rounded-full border border-[#7c6fe0]/40 bg-[#7c6fe0]/15 px-2 py-1 text-xs text-[#bdb4ff]">
            Streaming
          </span>
        ) : null}
      </div>

      {isStreaming && !hasAnyContent ? (
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-24 rounded-2xl border border-zinc-800 bg-zinc-900/50 animate-pulse" />
          ))}
          <p className="text-xs text-zinc-500">Waiting for first tokens...</p>
        </div>
      ) : null}

      {!isStreaming && !hasAnyContent ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 p-6 text-sm text-zinc-500">
          Start a stream to see Summary, Key Points/Expansions, Blind Spots, and Questions appear live.
        </div>
      ) : null}

      <AnimatePresence mode="sync" initial={false}>
        {hasSummary ? (
          <SectionCard
            key="summary"
            title="Summary"
            speakText={summarySpeakText}
            isSpeaking={state === "playing" && currentKey === "summary"}
            isLoadingAudio={state === "loading" && currentKey === "summary"}
            onSpeak={() => {
              if (state === "playing" && currentKey === "summary") {
                stop();
                return;
              }
              void speak(summarySpeakText, "summary");
            }}
          >
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">{breakdown.summary}</p>
          </SectionCard>
        ) : null}

        {hasSecondSection ? (
          <SectionCard
            key="second"
            title={secondLabel}
            speakText={secondSpeakText}
            isSpeaking={state === "playing" && currentKey === "second"}
            isLoadingAudio={state === "loading" && currentKey === "second"}
            onSpeak={() => {
              if (state === "playing" && currentKey === "second") {
                stop();
                return;
              }
              void speak(secondSpeakText, "second");
            }}
          >
            <AnimatedList items={secondItems} />
          </SectionCard>
        ) : null}

        {hasBlindSpots ? (
          <SectionCard
            key="blind-spots"
            title="Blind Spots"
            speakText={blindSpotsSpeakText}
            isSpeaking={state === "playing" && currentKey === "blind-spots"}
            isLoadingAudio={state === "loading" && currentKey === "blind-spots"}
            onSpeak={() => {
              if (state === "playing" && currentKey === "blind-spots") {
                stop();
                return;
              }
              void speak(blindSpotsSpeakText, "blind-spots");
            }}
          >
            <AnimatedList items={breakdown.blindSpots} />
          </SectionCard>
        ) : null}

        {hasQuestions ? (
          <SectionCard
            key="questions"
            title="Questions to Consider"
            speakText={questionsSpeakText}
            isSpeaking={state === "playing" && currentKey === "questions"}
            isLoadingAudio={state === "loading" && currentKey === "questions"}
            onSpeak={() => {
              if (state === "playing" && currentKey === "questions") {
                stop();
                return;
              }
              void speak(questionsSpeakText, "questions");
            }}
          >
            <AnimatedList items={breakdown.questions} />
          </SectionCard>
        ) : null}
      </AnimatePresence>

      {isStreaming ? (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-zinc-500">
          Panels render as soon as partial JSON fields become parsable.
        </motion.p>
      ) : null}
    </section>
  );
}

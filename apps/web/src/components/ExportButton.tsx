"use client";

import { toast } from "sonner";
import type { ParsedBreakdown } from "@/lib/parsePartialJson";
import type { ThoughtMode } from "@/lib/prompts";
import { Button } from "@/components/ui/button";

type ExportButtonProps = {
  thought: string;
  mode: ThoughtMode;
  breakdown: ParsedBreakdown;
};

export function ExportButton({ thought, mode, breakdown }: ExportButtonProps) {
  async function handleCopy() {
    const markdown = toMarkdown(thought, mode, breakdown);
    await navigator.clipboard.writeText(markdown);
    toast.success("Copied as Markdown");
  }

  return (
    <Button variant="outline" onClick={handleCopy}>
      Copy Markdown
    </Button>
  );
}

function toMarkdown(thought: string, mode: ThoughtMode, breakdown: ParsedBreakdown): string {
  const secondHeading = mode === "expand" ? "Expansions" : "Key Points";
  const secondItems = mode === "expand" ? breakdown.expansions : breakdown.keyPoints;

  const secondList = secondItems.map((item) => `- ${item}`).join("\n") || "- (empty)";
  const blindSpots = breakdown.blindSpots.map((item) => `- ${item}`).join("\n") || "- (empty)";
  const questions = breakdown.questions.map((item) => `- ${item}`).join("\n") || "- (empty)";

  return [
    "# Unfold Output",
    "",
    `**Mode:** ${mode}`,
    "",
    "## Raw Thought",
    thought,
    "",
    "## Summary",
    breakdown.summary || "(empty)",
    "",
    `## ${secondHeading}`,
    secondList,
    "",
    "## Blind Spots",
    blindSpots,
    "",
    "## Questions to Consider",
    questions,
  ].join("\n");
}

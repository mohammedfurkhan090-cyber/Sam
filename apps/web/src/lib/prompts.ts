export type ThoughtMode = "structure" | "poke" | "expand";

export const modeOptions: Array<{ value: ThoughtMode; label: string; description: string }> = [
  {
    value: "structure",
    label: "Structure it",
    description: "Organize the thought into clear shape and priorities.",
  },
  {
    value: "poke",
    label: "Poke holes in it",
    description: "Challenge assumptions and expose weak spots directly.",
  },
  {
    value: "expand",
    label: "Expand it",
    description: "Open new angles and adjacent possibilities.",
  },
];

// Frontend keeps these strings so mode behavior is transparent in UI copy.
// Backend remains the source of truth for actual prompting.
export const modePromptBlueprint: Record<ThoughtMode, string> = {
  structure:
    'JSON schema: {"summary":"string","keyPoints":["string"],"blindSpots":["string"],"questions":["string"]}. Keep balanced and constructive.',
  poke:
    'JSON schema: {"summary":"string","keyPoints":["string"],"blindSpots":["string"],"questions":["string"]}. Make blindSpots and questions sharper and more critical.',
  expand:
    'JSON schema: {"summary":"string","expansions":["string"],"blindSpots":["string"],"questions":["string"]}. Replace keyPoints with expansions that introduce new angles.',
};

export function modeHelperText(mode: ThoughtMode): string {
  if (mode === "poke") {
    return "Expect sharper pushback in blind spots and questions.";
  }

  if (mode === "expand") {
    return "Key points are replaced with expansions for new idea directions.";
  }

  return "Best default for turning a raw thought into a clean first draft.";
}

export function modePlaceholder(mode: ThoughtMode): string {
  if (mode === "poke") {
    return "Paste a belief, plan, or argument you want stress-tested.";
  }

  if (mode === "expand") {
    return "Paste a seed idea you want to broaden into multiple paths.";
  }

  return "Paste a raw thought: messy is good. Unfold will structure it live.";
}

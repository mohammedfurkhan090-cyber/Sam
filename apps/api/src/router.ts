import { groq } from "./groq.js";

export type ToolName = "unfold" | "search" | "code" | "speak" | "image" | "slides" | "rag" | "agent" | "none";

export type RouterDecision = {
  tool: ToolName;
  confidence: "high" | "medium" | "low";
  extractedParams: {
    thought?: string;
    mode?: "structure" | "poke" | "expand";
    text?: string;
    query?: string;
  };
  reasoning: string;
};

const ROUTER_MODEL = "llama-3.3-70b-versatile";

const ROUTER_SYSTEM_PROMPT = [
  "You are Sam's deterministic tool router. Classify exactly one user message into exactly one tool.",
  "Return ONLY valid JSON. No markdown. No explanation outside JSON.",
  "Schema:",
  '{"tool":"unfold|search|code|speak|image|slides|rag|agent|none","confidence":"high|medium|low","extractedParams":{"thought?":"string","mode?":"structure|poke|expand","text?":"string","query?":"string"},"reasoning":"one short sentence"}',
  "Tool rules:",
  "- none: normal conversation, greetings, opinions, simple explanations, brainstorming, or meta questions about Sam.",
  '- search: current facts, latest information, news, prices, rankings, release dates, laws, schedules, or explicit web lookup. If the user asks for "latest", "current", "today", or "now", choose search.',
  "- code: writing, debugging, reviewing, explaining, refactoring, running, or designing code.",
  '- rag: user asks about uploaded files, notes, documents, PDFs, saved memory, or "my file/document/notes".',
  "- image: user asks to create, generate, draw, design, render, or visualize an image.",
  "- slides: user asks to create a deck, slides, slideshow, PPT, or presentation.",
  "- speak: user asks to read aloud, narrate, say, voice, or convert text to speech.",
  "- unfold: user wants structured thinking, deep analysis, critique, expansion, planning, decision support, or stress-testing.",
  '- agent: only for multi-step work requiring combined tools, such as "research X and make slides", "search and compare sources", "analyze my docs and create output", or "investigate then produce a deliverable".',
  "Unfold mode:",
  "- structure: organize, clarify, summarize, plan.",
  "- poke: challenge, critique, devil's advocate, stress-test.",
  "- expand: generate angles, possibilities, connections, alternatives.",
  'Important: "Sam" is the assistant/product name, not a person.',
  "Never invent extracted parameters.",
  "If the request can be answered without a tool, choose none.",
  "If unsure between agent and a single tool, choose the single tool.",
].join("\n");

function pickJsonObject(text: string): string {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Router response did not contain a JSON object.");
  }
  return text.slice(start, end + 1);
}

function isToolName(value: unknown): value is ToolName {
  return value === "unfold" || value === "search" || value === "code" || value === "speak" || value === "image" || value === "slides" || value === "rag" || value === "agent" || value === "none";
}

function isConfidence(value: unknown): value is RouterDecision["confidence"] {
  return value === "high" || value === "medium" || value === "low";
}

function isUnfoldMode(value: unknown): value is "structure" | "poke" | "expand" {
  return value === "structure" || value === "poke" || value === "expand";
}

function normalizeDecision(parsed: unknown): RouterDecision {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Router response was not an object.");
  }

  const obj = parsed as Record<string, unknown>;
  const extractedRaw =
    obj.extractedParams && typeof obj.extractedParams === "object"
      ? (obj.extractedParams as Record<string, unknown>)
      : {};

  if (!isToolName(obj.tool)) {
    throw new Error("Router returned an invalid tool.");
  }
  if (!isConfidence(obj.confidence)) {
    throw new Error("Router returned an invalid confidence.");
  }
  if (typeof obj.reasoning !== "string" || !obj.reasoning.trim()) {
    throw new Error("Router returned invalid reasoning.");
  }

  const extractedParams: RouterDecision["extractedParams"] = {};
  if (typeof extractedRaw.thought === "string" && extractedRaw.thought.trim()) {
    extractedParams.thought = extractedRaw.thought.trim();
  }
  if (isUnfoldMode(extractedRaw.mode)) {
    extractedParams.mode = extractedRaw.mode;
  }
  if (typeof extractedRaw.text === "string" && extractedRaw.text.trim()) {
    extractedParams.text = extractedRaw.text.trim();
  }
  if (typeof extractedRaw.query === "string" && extractedRaw.query.trim()) {
    extractedParams.query = extractedRaw.query.trim();
  }

  return {
    tool: obj.tool,
    confidence: obj.confidence,
    extractedParams,
    reasoning: obj.reasoning.trim(),
  };
}

export async function routeMessage(
  userMessage: string,
  disabledTools?: string[]
): Promise<RouterDecision> {
  const completion = await groq.chat.completions.create({
    model: ROUTER_MODEL,
    temperature: 0.1,
    messages: [
      { role: "system", content: ROUTER_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const cleaned = raw.replace(/```json|```/gi, "").trim();

  try {
    const parsed = JSON.parse(pickJsonObject(cleaned));
    const decision = normalizeDecision(parsed);
    if (disabledTools?.includes(decision.tool)) {
      decision.tool = "none";
    }
    return decision;
  } catch {
    return { tool: "none", confidence: "high", reasoning: "Fallback to none", extractedParams: {} } as RouterDecision;
  }
}

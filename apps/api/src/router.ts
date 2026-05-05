import { groq } from "./groq.js";

export type ToolName = "unfold" | "speak" | "search" | "none";

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
  "You are the tool router for Sam, an AI thinking partner.",
  "Your task: read one user message and pick the best tool.",
  "Return ONLY valid JSON. No markdown. No code fences. No extra text.",
  "JSON must match this exact shape:",
  '{"tool":"unfold|speak|search|none","confidence":"high|medium|low","extractedParams":{"thought?":"string","mode?":"structure|poke|expand","text?":"string","query?":"string"},"reasoning":"string"}',
  "Routing rules:",
  "- unfold: user wants to think through, analyze, structure, challenge, or expand an idea, concept, or plan.",
  '- speak: user says "read this", "say this", "read aloud", or similar.',
  "- search: user asks for current events/facts or asks to look up/search/find out something.",
  "- none: greetings, thank-yous, meta questions about Sam, or anything that does not fit above.",
  'Important: "Sam" is the product/assistant name, not a human person.',
  "Unfold mode rules:",
  "- structure: default for organizing or clarifying a thought.",
  "- poke: user requests pushback, devil's advocate, challenge, or stress-test.",
  "- expand: user asks for new angles, broader context, or connections.",
  "Extract only parameters that are clearly present in the user message.",
  "Never invent values. If uncertain, omit the parameter.",
  "confidence must reflect routing certainty.",
  "reasoning must be exactly one sentence.",
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
  return value === "unfold" || value === "speak" || value === "search" || value === "none";
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

export async function routeMessage(userMessage: string): Promise<RouterDecision> {
  // Routing is intentionally separated from execution so we can decide first,
  // then let dedicated handlers execute with clear boundaries and safer control.
  const completion = await groq.chat.completions.create({
    model: ROUTER_MODEL,
    // We use 0.1 here for deterministic classification; unfold uses 0.2 because
    // generation benefits from slight creativity while routing should stay stable.
    temperature: 0.1,
    messages: [
      { role: "system", content: ROUTER_SYSTEM_PROMPT },
      { role: "user", content: userMessage },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const parsed = JSON.parse(pickJsonObject(raw));
  const decision = normalizeDecision(parsed);

  // Downstream can use confidence as a guardrail: low confidence should trigger
  // a clarification question instead of blindly invoking a possibly wrong tool.
  return decision;
}

/*
Manual test record for POST /api/v1/route (May 5, 2026):

Input:
{"message":"I want to think through whether I should learn Rust or Go next"}
Output:
{"tool":"unfold","confidence":"high","extractedParams":{"thought":"whether I should learn Rust or Go next","mode":"structure"},"reasoning":"The user is seeking to analyze and structure their thoughts on choosing between two programming languages to learn next."}

Input:
{"message":"Challenge my idea that React is always better than Vue"}
Output:
{"tool":"unfold","confidence":"high","extractedParams":{"thought":"React is always better than Vue","mode":"poke"},"reasoning":"The user is asking to challenge their idea, which indicates a need for pushback or a devil's advocate perspective, best handled by the unfold tool in poke mode."}

Input:
{"message":"Hey Sam, how are you?"}
Output:
{"tool":"none","confidence":"high","extractedParams":{},"reasoning":"The user is asking a greeting question about Sam, which does not fit into any of the other tool categories."}
*/

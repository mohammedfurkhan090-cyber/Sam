import { groq } from "./groq.js";
const ROUTER_MODEL = "llama-3.3-70b-versatile";
const ROUTER_SYSTEM_PROMPT = [
    "You are the tool router for Sam, an AI thinking partner.",
    "Your task: read one user message and pick the best tool.",
    "Return ONLY valid JSON. No markdown. No code fences. No extra text.",
    "JSON must match this exact shape:",
    '{"tool":"unfold|search|code|speak|none","confidence":"high|medium|low","extractedParams":{"thought?":"string","mode?":"structure|poke|expand","text?":"string","query?":"string"},"reasoning":"string"}',
    "Routing rules:",
    "- unfold: user wants to think through, analyze, structure, challenge, or expand an idea, concept, or plan.",
    "- code: user wants to write, debug, review, or explain code.",
    "- search: user asks about current events, facts, or wants to look something up.",
    '- speak: user says "read this", "say this", "read aloud", or similar.',
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
function pickJsonObject(text) {
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
        throw new Error("Router response did not contain a JSON object.");
    }
    return text.slice(start, end + 1);
}
function isToolName(value) {
    return value === "unfold" || value === "search" || value === "code" || value === "speak" || value === "none";
}
function isConfidence(value) {
    return value === "high" || value === "medium" || value === "low";
}
function isUnfoldMode(value) {
    return value === "structure" || value === "poke" || value === "expand";
}
function normalizeDecision(parsed) {
    if (!parsed || typeof parsed !== "object") {
        throw new Error("Router response was not an object.");
    }
    const obj = parsed;
    const extractedRaw = obj.extractedParams && typeof obj.extractedParams === "object"
        ? obj.extractedParams
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
    const extractedParams = {};
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
export async function routeMessage(userMessage) {
    const completion = await groq.chat.completions.create({
        model: ROUTER_MODEL,
        temperature: 0.1,
        messages: [
            { role: "system", content: ROUTER_SYSTEM_PROMPT },
            { role: "user", content: userMessage },
        ],
    });
    const raw = completion.choices[0]?.message?.content ?? "";
    const parsed = JSON.parse(pickJsonObject(raw));
    return normalizeDecision(parsed);
}

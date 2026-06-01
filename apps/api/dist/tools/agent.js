import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tavily } from "@tavily/core";
import { retrieveContext } from "../rag/retrieve.js";
import { generateImage } from "./image.js";
import { generateSlides } from "./slides.js";
function sendEvent(res, type, payload) {
    res.write(`data: ${JSON.stringify({ type, payload })}\n\n`);
}
const llm = new ChatGroq({
    model: "llama-3.3-70b-versatile",
    temperature: 0.2,
    apiKey: process.env.GROQ_API_KEY,
});
const AGENT_REASONING_SYSTEM_PROMPT = [
    "You are Sam's agent reasoning core. You receive context from tools such as Tavily search and document retrieval.",
    "Your job:",
    "- Understand the user's requested deliverable.",
    "- Synthesize gathered context.",
    "- Decide the correct final output type.",
    "- If the output is image, make the synthesis a Stability AI-ready prompt.",
    "- If the output is slides, make the synthesis a 2Slides-ready generation brief.",
    "- Produce a useful result without inventing tool outputs.",
    "Rules:",
    "- Use web context for public/current facts.",
    "- Use document context for user-specific/private facts.",
    "- If context is weak, missing, or conflicting, say so.",
    "- Do not invent URLs, sources, files, statistics, or generated artifacts.",
    "- Do not expose internal planning or chain-of-thought.",
    "- Be concise but complete.",
    "Private quality loop:",
    "1. Draft the synthesis.",
    "2. Find unsupported claims and remove or qualify them.",
    "3. Identify the strongest objection to the conclusion.",
    "4. Address it if relevant.",
    "5. Confirm the output tag matches the user's requested deliverable.",
    "End with exactly one tag on its own line:",
    "[OUTPUT:slides]",
    "[OUTPUT:image]",
    "[OUTPUT:code]",
    "[OUTPUT:text]",
    "Do not explain the tag.",
].join("\n");
const AGENT_CODE_SYSTEM_PROMPT = [
    "You are Sam in senior software engineer mode.",
    "Be practical, concise, and production-minded.",
    "Use the gathered context only when it helps answer the user's coding request.",
    "Provide clean code with correct language-tagged markdown fences, minimal useful comments, and brief verification steps.",
    "Do not claim code was executed unless execution output is provided.",
].join("\n");
async function gatherContext(state) {
    const results = [];
    // Tavily search
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey) {
        try {
            const client = tavily({ apiKey: tavilyKey });
            const searchRes = await client.search(state.message, { maxResults: 4 });
            const formatted = (searchRes.results ?? [])
                .map((r, i) => `${i + 1}. ${r.title}\n${r.url}\n${r.content ?? ""}`)
                .join("\n\n");
            if (formatted)
                results.push(`[Web Search]\n${formatted}`);
        }
        catch (error) {
            console.error("[agent]", error);
        }
    }
    // RAG retrieval
    try {
        const chunks = await retrieveContext(state.message, 4);
        if (chunks.length) {
            results.push(`[Your Documents]\n${chunks.join("\n\n")}`);
        }
    }
    catch (error) {
        console.error("[agent]", error);
    }
    return { context: results.join("\n\n---\n\n") || "No context gathered." };
}
async function reasonAndSynthesize(state) {
    const response = await llm.invoke([
        new SystemMessage(AGENT_REASONING_SYSTEM_PROMPT),
        new HumanMessage(`User request: ${state.message}\n\nGathered context:\n${state.context}`),
    ]);
    const raw = typeof response.content === "string" ? response.content : "";
    const tagMatch = raw.match(/\[OUTPUT:(slides|image|code|text)\]/);
    const outputType = (tagMatch?.[1] ?? "text");
    const reasoning = raw.replace(/\[OUTPUT:(slides|image|code|text)\]/, "").trim();
    return { reasoning, outputType };
}
async function executeOutput(state) {
    if (state.outputType === "image") {
        try {
            const image = await generateImage(state.reasoning || state.message);
            return {
                result: image.output.imageUrl ?? image.output.chat ?? "Image generation failed.",
            };
        }
        catch {
            return { result: "Image generation failed." };
        }
    }
    if (state.outputType === "slides") {
        try {
            const url = await generateSlides(state.reasoning || state.message);
            return { result: url };
        }
        catch {
            return { result: "Slides generation failed." };
        }
    }
    if (state.outputType === "code") {
        try {
            const response = await llm.invoke([
                new SystemMessage(AGENT_CODE_SYSTEM_PROMPT),
                new HumanMessage(`Context:\n${state.reasoning}\n\nUser request: ${state.message}`),
            ]);
            return {
                result: typeof response.content === "string" ? response.content : "",
            };
        }
        catch {
            return { result: "Code generation failed." };
        }
    }
    // text - result is already in reasoning
    return { result: state.reasoning };
}
const agentGraph = new StateGraph({
    channels: {
        message: { value: (a, b) => b ?? a, default: () => "" },
        context: { value: (a, b) => b ?? a, default: () => "" },
        reasoning: { value: (a, b) => b ?? a, default: () => "" },
        outputType: {
            value: (a, b) => b ?? a,
            default: () => "text",
        },
        result: { value: (a, b) => b ?? a, default: () => "" },
    },
})
    .addNode("gatherContext", gatherContext)
    .addNode("reasonAndSynthesize", reasonAndSynthesize)
    .addNode("executeOutput", executeOutput)
    .addEdge(START, "gatherContext")
    .addEdge("gatherContext", "reasonAndSynthesize")
    .addEdge("reasonAndSynthesize", "executeOutput")
    .addEdge("executeOutput", END)
    .compile();
export async function handleAgent(message, history, res) {
    try {
        sendEvent(res, "reply", { text: "Thinking...\n" });
        const finalState = await agentGraph.invoke({ message });
        if (finalState.outputType === "image") {
            sendEvent(res, "image", { url: finalState.result });
        }
        else if (finalState.outputType === "slides") {
            sendEvent(res, "reply", {
                text: "Generating your slides, this takes about 30 seconds...",
            });
            sendEvent(res, "slides", { url: finalState.result });
        }
        else {
            sendEvent(res, "reply", { text: finalState.result });
        }
        sendEvent(res, "done", null);
        res.end();
    }
    catch (error) {
        console.error("agent error:", error);
        sendEvent(res, "error", { message: "Agent failed" });
        sendEvent(res, "done", null);
        res.end();
    }
}

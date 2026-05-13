import { StateGraph, START, END } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { tavily } from "@tavily/core";
import { type Response } from "express";
import { retrieveContext } from "../rag/retrieve.js";
import { generateImage } from "./image.js";
import { generateSlides } from "./slides.js";

type AgentState = {
  message: string;
  context: string;
  reasoning: string;
  outputType: "slides" | "image" | "code" | "text";
  result: string;
};

function sendEvent(res: Response, type: string, payload: unknown) {
  res.write(`data: ${JSON.stringify({ type, payload })}\n\n`);
}

const llm = new ChatGroq({
  model: "llama-3.3-70b-versatile",
  temperature: 0.2,
  apiKey: process.env.GROQ_API_KEY,
});

async function gatherContext(state: AgentState): Promise<Partial<AgentState>> {
  const results: string[] = [];

  // Tavily search
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (tavilyKey) {
    try {
      const client = tavily({ apiKey: tavilyKey });
      const searchRes = await client.search(state.message, { maxResults: 4 });
      const formatted = (searchRes.results ?? [])
        .map((r, i) => `${i + 1}. ${r.title}\n${r.url}\n${r.content ?? ""}`)
        .join("\n\n");
      if (formatted) results.push(`[Web Search]\n${formatted}`);
    } catch (error) {
      console.error("[agent]", error);
    }
  }

  // RAG retrieval
  try {
    const chunks = await retrieveContext(state.message, 4);
    if (chunks.length) {
      results.push(`[Your Documents]\n${chunks.join("\n\n")}`);
    }
  } catch (error) {
    console.error("[agent]", error);
  }

  return { context: results.join("\n\n---\n\n") || "No context gathered." };
}

async function reasonAndSynthesize(state: AgentState): Promise<Partial<AgentState>> {
  const systemPrompt = [
    "You are Sam's reasoning core. You have gathered context from search and documents.",
    "Your job: synthesize the context into a clear answer for the user's request.",
    "Also decide the best output format by outputting one of these tags on the very last line:",
    "[OUTPUT:slides] - if the user asked for a presentation or deck",
    "[OUTPUT:image] - if the user asked for an image or visual",
    "[OUTPUT:code] - if the user asked for code, a script, or implementation",
    "[OUTPUT:text] - for everything else",
    "Do not explain your format choice. Just write your synthesis, then end with the tag.",
  ].join("\n");

  const response = await llm.invoke([
    new SystemMessage(systemPrompt),
    new HumanMessage(
      `User request: ${state.message}\n\nGathered context:\n${state.context}`,
    ),
  ]);

  const raw = typeof response.content === "string" ? response.content : "";
  const tagMatch = raw.match(/\[OUTPUT:(slides|image|code|text)\]/);
  const outputType = (tagMatch?.[1] ?? "text") as AgentState["outputType"];
  const reasoning = raw.replace(/\[OUTPUT:(slides|image|code|text)\]/, "").trim();

  return { reasoning, outputType };
}

async function executeOutput(state: AgentState): Promise<Partial<AgentState>> {
  if (state.outputType === "image") {
    try {
      const url = await generateImage(state.message);
      return { result: url };
    } catch {
      return { result: "Image generation failed." };
    }
  }

  if (state.outputType === "slides") {
    try {
      const url = await generateSlides(state.message);
      return { result: url };
    } catch {
      return { result: "Slides generation failed." };
    }
  }

  if (state.outputType === "code") {
    try {
      const response = await llm.invoke([
        new SystemMessage(
          "You are a senior software engineer. Be practical and concise. Provide clean code with brief explanation.",
        ),
        new HumanMessage(
          `Context:\n${state.reasoning}\n\nUser request: ${state.message}`,
        ),
      ]);
      return {
        result: typeof response.content === "string" ? response.content : "",
      };
    } catch {
      return { result: "Code generation failed." };
    }
  }

  // text — result is already in reasoning
  return { result: state.reasoning };
}

const agentGraph = new StateGraph<AgentState>({
  channels: {
    message: { value: (a: string, b: string) => b ?? a, default: () => "" },
    context: { value: (a: string, b: string) => b ?? a, default: () => "" },
    reasoning: { value: (a: string, b: string) => b ?? a, default: () => "" },
    outputType: {
      value: (
        a: AgentState["outputType"],
        b: AgentState["outputType"],
      ) => b ?? a,
      default: () => "text" as const,
    },
    result: { value: (a: string, b: string) => b ?? a, default: () => "" },
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

export async function handleAgent(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  res: Response,
): Promise<void> {
  try {
    sendEvent(res, "reply", { text: "Thinking...\n" });

    const finalState = await agentGraph.invoke({ message });

    if (finalState.outputType === "image") {
      sendEvent(res, "image", { url: finalState.result });
    } else if (finalState.outputType === "slides") {
      sendEvent(res, "reply", {
        text: "Generating your slides, this takes about 30 seconds...",
      });
      sendEvent(res, "slides", { url: finalState.result });
    } else {
      sendEvent(res, "reply", { text: finalState.result });
    }

    sendEvent(res, "done", null);
    res.end();
  } catch (error) {
    console.error("agent error:", error);
    sendEvent(res, "error", { message: "Agent failed" });
    sendEvent(res, "done", null);
    res.end();
  }
}

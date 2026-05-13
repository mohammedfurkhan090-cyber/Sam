import "dotenv/config";
import { tavily } from "@tavily/core";
import cors from "cors";
import express, { type Response } from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { groq, groqModel } from "./groq.js";
import { handleRag } from "./rag/index.js";
import { ingestDocument } from "./rag/ingest.js";
import { routeMessage } from "./router.js";
import { handleAgent } from "./tools/agent.js";
import { generateImage } from "./tools/image.js";
import { generateSlides } from "./tools/slides.js";
import { handleSpeak } from "./tools/speak.js";

const app = express();
const port = Number(process.env.API_PORT ?? 4000);
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

type ChatHistoryItem = { role: "user" | "assistant"; content: string };
type ChatRequest = { message: string; history?: ChatHistoryItem[]; activeTools?: Record<string, boolean> };

const tavilyApiKey = process.env.TAVILY_API_KEY;

function sendEvent(res: Response, type: string, payload: unknown) {
  res.write(`data: ${JSON.stringify({ type, payload })}\n\n`);
}

// Build Gemini-format history from conversation history
// Gemini uses "user" and "model" (not "assistant")
function buildGeminiHistory(system: string, history?: ChatHistoryItem[]) {
  const turns: { role: string; parts: { text: string }[] }[] = [
    { role: "user", parts: [{ text: system }] },
    { role: "model", parts: [{ text: "Understood." }] },
  ];

  if (history && history.length > 0) {
    for (const msg of history) {
      if (!msg.content?.trim()) continue;
      turns.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.content }],
      });
    }
  }

  return turns;
}

// Stream Gemini — sends { type: "token", payload: { text } } which useSamChat expects
// history: previous conversation turns to give Gemini context
async function streamGemini(
  prompt: string,
  system: string,
  res: Response,
  history?: ChatHistoryItem[]
) {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const chat = model.startChat({
      history: buildGeminiHistory(system, history),
    });
    const result = await chat.sendMessageStream(prompt);
    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) sendEvent(res, "token", { text });
    }
  } catch (err: any) {
    // 429 fallback to Groq
    if (err.status === 429) {
      // Build Groq messages: system + history turns + current prompt
      const groqMessages: { role: "system" | "user" | "assistant"; content: string }[] = [
        { role: "system", content: system },
      ];
      if (history && history.length > 0) {
        for (const msg of history) {
          if (!msg.content?.trim()) continue;
          groqMessages.push({ role: msg.role, content: msg.content });
        }
      }
      groqMessages.push({ role: "user", content: prompt });

      const stream = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        stream: true,
        messages: groqMessages,
      });
      for await (const chunk of stream) {
        const text = chunk.choices[0]?.delta?.content;
        if (text) sendEvent(res, "token", { text });
      }
    } else {
      throw err;
    }
  }
}

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "sam-api" });
});

app.post("/api/v1/chat", async (req, res) => {
  const { message, history, activeTools } = req.body as ChatRequest;
  if (!message?.trim()) return res.status(400).json({ error: "message is required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders?.();

  try {
    const trimmedMessage = message.trim();
    const disabledTools = activeTools
      ? Object.entries(activeTools)
          .filter(([_, enabled]) => !enabled)
          .map(([tool]) => tool)
      : [];
    const decision = await routeMessage(trimmedMessage, disabledTools);
    sendEvent(res, "routing", decision);

    try {
      // ── UNFOLD ──────────────────────────────────────────────
      if (decision.tool === "unfold") {
        const thought = decision.extractedParams?.thought ?? trimmedMessage;
        const prompt = `Return ONLY valid JSON, no markdown, no explanation:
{ "summary": "...", "keyPoints": ["..."], "blindSpots": ["..."], "questions": ["..."] }
Input: ${thought}`;
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
        const result = await model.generateContent(prompt);
        let raw = result.response.text().trim();
        // Strip markdown fences if present
        raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        const parsed = JSON.parse(raw);
        sendEvent(res, "token", { text: JSON.stringify(parsed) });
        sendEvent(res, "done", null);
        return res.end();
      }

      // ── CODE ────────────────────────────────────────────────
      if (decision.tool === "code") {
        await streamGemini(
          trimmedMessage,
          "You are an expert programmer. Return clean, well-commented code. Always use markdown code blocks with the correct language tag.",
          res,
          history
        );
        sendEvent(res, "done", null);
        return res.end();
      }

      // ── SEARCH ──────────────────────────────────────────────
      if (decision.tool === "search") {
        if (!tavilyApiKey) throw new Error("Search is not configured");
        const client = tavily({ apiKey: tavilyApiKey });
        const searchResponse = await client.search(
          decision.extractedParams?.query ?? trimmedMessage,
          { maxResults: 5 }
        );

        const context = (searchResponse.results ?? [])
          .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${(r.content ?? "").slice(0, 600)}`)
          .join("\n\n");

        if (!context) {
          sendEvent(res, "reply", { text: "No results found for your query." });
          sendEvent(res, "done", null);
          return res.end();
        }

        const searchPrompt = `Based on these search results, give a clean, well-structured answer to: "${trimmedMessage}"

Search results:
${context}

Format your response as:
- A 2-3 sentence direct answer at the top
- Then 3-5 key findings as bullet points, each with a source reference like [1], [2]
- End with a "Sources" section listing the URLs

Be concise. No raw URLs in the main text. No markdown link syntax like [text](url).`;

        await streamGemini(
          searchPrompt,
          "You are Sam, a research assistant. Summarize search results clearly and concisely.",
          res,
          history
        );
        sendEvent(res, "done", null);
        return res.end();
      }

      // ── IMAGE ───────────────────────────────────────────────
      if (decision.tool === "image") {
        const result = await generateImage(decision.extractedParams?.query ?? trimmedMessage);
        sendEvent(res, "image", { url: result.output.imageUrl });
        res.write("data: [DONE]\n\n");
        return res.end();
      }

      // ── SLIDES ──────────────────────────────────────────────
      if (decision.tool === "slides") {
        sendEvent(res, "reply", { text: "Generating your slides, this takes about 30 seconds..." });
        const downloadUrl = await generateSlides(trimmedMessage);
        sendEvent(res, "slides", { url: downloadUrl });
        sendEvent(res, "done", null);
        return res.end();
      }

      // ── AGENT ───────────────────────────────────────────────
      if (decision.tool === "agent") {
        await handleAgent(trimmedMessage, history ?? [], res);
        return;
      }

      // ── RAG ─────────────────────────────────────────────────
      if (decision.tool === "rag") {
        await handleRag(trimmedMessage, history ?? [], res);
        return;
      }

      // ── SPEAK ───────────────────────────────────────────────
      if (decision.tool === "speak") {
        sendEvent(res, "reply", { text: "Use the listen button to hear this read aloud." });
        sendEvent(res, "done", null);
        return res.end();
      }

      // ── DEFAULT CHAT (none / fallback) ───────────────────────
      await streamGemini(
        trimmedMessage,
        "You are Sam, a brilliant personal AI orchestrator. Be concise, insightful, warm, and direct. Format responses with markdown when helpful.",
        res,
        history
      );
      sendEvent(res, "done", null);
      return res.end();

    } catch (err: any) {
      console.error("chat stream error:", err);
      sendEvent(res, "error", {
        tool: decision.tool,
        output: { chat: `Something went wrong: ${err?.message ?? "unknown error"}` },
      });
      res.write("data: [DONE]\n\n");
      res.end();
    }
  } catch (error) {
    console.error("fatal stream error:", error);
    res.end();
  }
});

app.post("/api/v1/ingest", async (req, res) => {
  try {
    const { text, metadata } = req.body as { text: string; metadata?: Record<string, unknown> };
    if (!text?.trim()) return res.status(400).json({ error: "text is required" });
    await ingestDocument(text, metadata);
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/v1/speak", handleSpeak);

app.post("/api/v1/suggest", async (req, res) => {
  try {
    const { message } = req.body as { message: string };
    if (!message?.trim()) return res.status(400).json({ suggestions: [] });

    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
    const prompt = `Based on this AI response, generate exactly 3 short follow-up questions or actions the user might ask next. Each must be under 8 words. Return ONLY a raw JSON array of 3 strings. No markdown, no explanation.

Response: "${message.slice(0, 500)}"`;

    const result = await model.generateContent(prompt);
    let raw = result.response.text().trim();
    raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
    const suggestions = JSON.parse(raw);
    res.json({ suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 3) : [] });
  } catch (err: any) {
    res.status(500).json({ suggestions: [] });
  }
});

app.listen(port, () => console.log(`API listening on http://localhost:${port}`));

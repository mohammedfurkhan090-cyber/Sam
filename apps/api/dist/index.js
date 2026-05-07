import "dotenv/config";
import { tavily } from "@tavily/core";
import cors from "cors";
import express from "express";
import { groq, groqModel } from "./groq.js";
import { routeMessage } from "./router.js";
import { handleCode } from "./tools/code.js";
import { handleSearch } from "./tools/search.js";
import { handleSpeak } from "./tools/speak.js";
import { getUnfoldSystemPrompt, handleUnfold } from "./tools/unfold.js";
const app = express();
const port = Number(process.env.API_PORT ?? 4000);
const tavilyApiKey = process.env.TAVILY_API_KEY;
function sendEvent(res, type, payload) {
    res.write(`data: ${JSON.stringify({ type, payload })}\n\n`);
}
app.use(cors());
app.use(express.json());
app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "sam-api" });
});
app.get("/api/v1/status", (_req, res) => {
    res.json({
        name: "Sam",
        phase: "building",
        aiProvider: "groq",
    });
});
app.post("/api/v1/chat", async (req, res) => {
    const { message, history } = req.body;
    if (!message?.trim()) {
        return res.status(400).json({ error: "message is required" });
    }
    if (message.length >= 3000) {
        return res.status(400).json({ error: "message too long" });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.flushHeaders?.();
    let closedByClient = false;
    res.on("close", () => {
        if (!res.writableEnded) {
            closedByClient = true;
        }
    });
    try {
        const trimmedMessage = message.trim();
        const decision = await routeMessage(trimmedMessage);
        sendEvent(res, "routing", decision);
        if (decision.tool === "unfold") {
            const thought = decision.extractedParams.thought ?? trimmedMessage;
            const mode = (decision.extractedParams.mode ?? "structure");
            const stream = await groq.chat.completions.create({
                model: groqModel,
                temperature: 0.2,
                stream: true,
                messages: [
                    { role: "system", content: getUnfoldSystemPrompt(mode) },
                    ...(history ?? []).slice(-6),
                    { role: "user", content: thought },
                ],
            });
            for await (const chunk of stream) {
                if (closedByClient) {
                    break;
                }
                const token = chunk.choices[0]?.delta?.content;
                if (!token) {
                    continue;
                }
                sendEvent(res, "token", { text: token });
            }
            sendEvent(res, "done", null);
            return res.end();
        }
        if (decision.tool === "code") {
            const stream = await groq.chat.completions.create({
                model: "deepseek-r1-distill-llama-70b",
                temperature: 0.2,
                stream: true,
                messages: [
                    {
                        role: "system",
                        content: "You are a senior software engineer. Provide practical, production-minded coding help with clear steps, edge cases, and concise code snippets when useful.",
                    },
                    ...(history ?? []).slice(-6),
                    { role: "user", content: trimmedMessage },
                ],
            });
            for await (const chunk of stream) {
                if (closedByClient) {
                    break;
                }
                const token = chunk.choices[0]?.delta?.content;
                if (!token) {
                    continue;
                }
                sendEvent(res, "token", { text: token });
            }
            sendEvent(res, "done", null);
            return res.end();
        }
        if (decision.tool === "search") {
            if (!tavilyApiKey) {
                sendEvent(res, "error", { message: "Search is not configured" });
                sendEvent(res, "done", null);
                return res.end();
            }
            const client = tavily({ apiKey: tavilyApiKey });
            const searchQuery = decision.extractedParams.query ?? trimmedMessage;
            const searchResponse = await client.search(searchQuery, { maxResults: 5 });
            const formatted = (searchResponse.results ?? [])
                .map((result, index) => `${index + 1}. ${result.title}\n${result.url}\n${result.content ?? ""}`)
                .join("\n\n");
            sendEvent(res, "reply", { text: formatted || "No results found." });
            sendEvent(res, "done", null);
            return res.end();
        }
        if (decision.tool === "none") {
            const stream = await groq.chat.completions.create({
                model: groqModel,
                temperature: 0.2,
                stream: true,
                messages: [
                    {
                        role: "system",
                        content: "You are Sam, a sharp AI thinking partner built to help people think clearer and act faster. Respond naturally to greetings and questions about what you are. Keep replies under 3 sentences. Never say you don't have feelings - just stay focused on being useful.",
                    },
                    ...(history ?? []).slice(-6),
                    { role: "user", content: trimmedMessage },
                ],
            });
            for await (const chunk of stream) {
                if (closedByClient) {
                    break;
                }
                const token = chunk.choices[0]?.delta?.content;
                if (!token) {
                    continue;
                }
                sendEvent(res, "reply", { text: token });
            }
            sendEvent(res, "done", null);
            return res.end();
        }
        if (decision.tool === "speak") {
            sendEvent(res, "reply", { text: "Use the listen button to hear this read aloud." });
            sendEvent(res, "done", null);
            return res.end();
        }
        sendEvent(res, "error", { message: "Unsupported tool route" });
        sendEvent(res, "done", null);
        return res.end();
    }
    catch (error) {
        console.error("chat stream error:", error);
        if (!closedByClient) {
            sendEvent(res, "error", { message: "chat failed" });
            sendEvent(res, "done", null);
            return res.end();
        }
        return;
    }
});
app.post("/api/v1/unfold", handleUnfold);
app.post("/api/v1/search", handleSearch);
app.post("/api/v1/code", handleCode);
app.post("/api/v1/speak", handleSpeak);
app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
});

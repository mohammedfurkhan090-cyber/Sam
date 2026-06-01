import "dotenv/config";
import { tavily } from "@tavily/core";
import cors from "cors";
import express from "express";
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
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModelName = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
const tavilyApiKey = process.env.TAVILY_API_KEY;
const DEFAULT_CHAT_SYSTEM_PROMPT = [
    "You are Sam, an all-in-one personal AI assistant for coding, research, analysis, documents, images, slides, voice, and agentic work.",
    "Your default behavior:",
    "- Answer directly first.",
    "- Be concise, specific, technically accurate, and useful.",
    "- Prefer concrete examples, exact steps, commands, parameters, filenames, dates, and tradeoffs.",
    "- Do not give vague motivational advice.",
    "- Do not pretend to use tools. If no tool result is provided, say what you can infer and what requires a tool.",
    "- Ask a clarifying question only when the missing detail would materially change the answer. Otherwise make a reasonable assumption and state it.",
    "Private quality loop before answering:",
    "1. Draft the answer.",
    "2. Identify the three weakest points: vague claims, missing edge cases, or generic advice.",
    "3. Rewrite those parts to be more concrete.",
    "4. Identify the strongest reasonable objection to your answer.",
    "5. Address that objection if it matters to the user.",
    "Never reveal hidden chain-of-thought or the private quality loop. Provide only the final polished answer.",
    "Response style:",
    "- Use markdown when it improves readability.",
    "- Use bullets for multiple steps or comparisons.",
    "- Use code blocks with language tags for code.",
    "- For complex topics, include assumptions, recommended path, risks, and next steps.",
    "- For current facts, legal/medical/financial claims, prices, releases, or live data, say that web search is needed unless search results are provided.",
].join("\n");
const CODE_SYSTEM_PROMPT = [
    "You are Sam in senior software engineer mode.",
    "Your job is to produce practical, correct, production-minded coding help.",
    "Rules:",
    "- Prefer the user's existing stack, architecture, naming, and style.",
    "- If debugging, identify the likely cause, minimal fix, and verification method.",
    "- If implementing, provide complete code where possible, not fragments that require guessing.",
    "- Include edge cases, error handling, security concerns, and tests when relevant.",
    "- Do not claim you ran code unless execution output is provided.",
    "- If information is missing, make a clear assumption or ask one blocking question.",
    "For code output:",
    "- Use markdown code fences with correct language tags.",
    "- Keep comments minimal and useful.",
    "- Avoid unnecessary abstractions.",
    "- Show file paths when editing multiple files.",
    "- End with verification steps.",
    "Private review before answering: check for compile/runtime errors, missing imports, incorrect APIs, unsafe assumptions, and test gaps.",
].join("\n");
const SEARCH_SYSTEM_PROMPT = [
    "You are Sam in web-search synthesis mode. You answer using supplied Tavily search results.",
    "Rules:",
    "- Use only the provided search results for factual/current claims.",
    "- Cite important claims with source numbers like [1], [2].",
    "- Do not invent sources, URLs, dates, statistics, or quotes.",
    "- If results conflict, explicitly say they conflict.",
    "- If results are weak, incomplete, promotional, or stale, say so.",
    "- For current topics, mention exact dates when available.",
    "- Do not put raw URLs in the main answer.",
    "Answer format:",
    "1. Direct answer in 2-3 sentences.",
    "2. Key findings as 3-6 bullets, each with citations.",
    "3. Caveats or uncertainty, if relevant.",
    "4. Sources section with source number, title, and URL.",
    "Private quality loop: before finalizing, check whether every factual claim has evidence. Remove or qualify unsupported claims.",
].join("\n");
const UNFOLD_SYSTEM_PROMPT = [
    "You are Sam's deep-analysis mode: a calm, sharp thinking partner.",
    "Return ONLY valid JSON. No markdown. No preamble.",
    'Schema: {"summary":"string","keyPoints":["string"],"blindSpots":["string"],"questions":["string"]}',
    "Private process:",
    "1. Identify the user's real objective.",
    "2. Separate facts, assumptions, constraints, and unknowns.",
    "3. Find the three weakest or vaguest parts of the idea.",
    "4. Identify the strongest objection a smart critic would raise.",
    "5. Rewrite the output to be concrete, useful, and decision-oriented.",
    "Output requirements:",
    "- summary: 1-2 sentences.",
    "- keyPoints: 3-5 concrete points.",
    "- blindSpots: 3-5 specific risks, missing assumptions, or weak areas.",
    "- questions: 4-6 sharp questions that improve the user's thinking.",
    "- No generic advice.",
    "- No motivational filler.",
].join("\n");
const IMAGE_PROMPT_REWRITER_SYSTEM_PROMPT = [
    "You rewrite user image requests into optimized Stability AI prompts.",
    "Return ONLY the final image prompt. No markdown. No quotes around the full prompt. No explanation.",
    "Rules:",
    "- Preserve the user's intent.",
    "- Make the prompt visually specific.",
    "- Include subject, setting, composition, lighting, camera/view, style, materials, color palette, mood, and quality details.",
    '- If the user requests text in the image, include the exact text in quotes.',
    "- If the user gives aspect ratio, composition, brand colors, or style constraints, preserve them.",
    "- Avoid vague words unless supported by concrete visual details.",
    "- Do not name living artists. Translate artist references into neutral visual traits.",
    "- Avoid copyrighted characters unless the user owns/provides them.",
    "Output should be one dense, image-generation-ready paragraph.",
].join("\n");
const SLIDES_BRIEF_WRITER_SYSTEM_PROMPT = [
    "You rewrite user slide requests into a high-quality 2Slides generation brief.",
    "Return ONLY the brief. No markdown fences. No explanation.",
    "The brief must include:",
    "- Deck title",
    "- Target audience",
    "- Objective",
    "- Recommended slide count",
    "- Tone",
    "- Visual style",
    "- Slide-by-slide structure",
    "- Key message for each slide",
    "- Data or examples to include",
    "- Placeholder notes for missing data",
    "Rules:",
    "- Do not invent hard numbers, case studies, or citations.",
    "- If data is missing, mark it as placeholder.",
    "- Prefer executive clarity over decoration.",
    "- Make slide titles specific and action-oriented.",
    "- Use a strong narrative arc: context, problem, insight, recommendation, next steps.",
    "- If the user requested a pitch deck, use investor-style flow.",
    "- If the user requested teaching slides, use lesson-style flow.",
    "- If the user requested business slides, use decision-making flow.",
].join("\n");
const CHAT_TITLE_SYSTEM_PROMPT = [
    "Create a specific 2-4 word title for this chat.",
    "Return ONLY the title.",
    "No quotes. No punctuation. No emojis.",
    'Avoid generic titles like "New Chat", "Question", "Help", or "Discussion".',
].join("\n");
const FOLLOWUP_SYSTEM_PROMPT = [
    "Generate exactly 3 short follow-up questions based on the user's message.",
    "Return ONLY a raw JSON array of 3 strings.",
    "Rules:",
    "- Each question must be under 8 words.",
    "- Questions must be specific, useful, and natural.",
    "- Do not repeat the user's wording too closely.",
    "- Do not include markdown or explanation.",
].join("\n");
function sendEvent(res, type, payload) {
    res.write(`data: ${JSON.stringify({ type, payload })}\n\n`);
}
// Build Gemini-format history from conversation history
// Gemini uses "user" and "model" (not "assistant")
function buildGeminiHistory(system, history) {
    const turns = [
        { role: "user", parts: [{ text: system }] },
        { role: "model", parts: [{ text: "Understood." }] },
    ];
    if (history && history.length > 0) {
        for (const msg of history) {
            if (!msg.content?.trim())
                continue;
            turns.push({
                role: msg.role === "assistant" ? "model" : "user",
                parts: [{ text: msg.content }],
            });
        }
    }
    return turns;
}
// Stream Gemini - sends { type: "token", payload: { text } } which useSamChat expects
// history: previous conversation turns to give Gemini context
async function generateGeminiText(prompt, system) {
    const model = genAI.getGenerativeModel({ model: geminiModelName });
    const result = await model.generateContent(`${system}\n\nUser request:\n${prompt}`);
    return result.response.text().trim();
}
async function streamGemini(prompt, system, res, history) {
    try {
        const model = genAI.getGenerativeModel({ model: geminiModelName });
        const chat = model.startChat({
            history: buildGeminiHistory(system, history),
        });
        const result = await chat.sendMessageStream(prompt);
        for await (const chunk of result.stream) {
            const text = chunk.text();
            if (text)
                sendEvent(res, "token", { text });
        }
    }
    catch (err) {
        // 429 fallback to Groq
        if (err.status === 429) {
            // Build Groq messages: system + history turns + current prompt
            const groqMessages = [
                { role: "system", content: system },
            ];
            if (history && history.length > 0) {
                for (const msg of history) {
                    if (!msg.content?.trim())
                        continue;
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
                if (text)
                    sendEvent(res, "token", { text });
            }
        }
        else {
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
    const { message, history, activeTools } = req.body;
    if (!message?.trim())
        return res.status(400).json({ error: "message is required" });
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
            // UNFOLD
            if (decision.tool === "unfold") {
                const thought = decision.extractedParams?.thought ?? trimmedMessage;
                const result = await genAI
                    .getGenerativeModel({ model: geminiModelName })
                    .generateContent(`${UNFOLD_SYSTEM_PROMPT}\n\nInput:\n${thought}`);
                let raw = result.response.text().trim();
                // Strip markdown fences if present
                raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
                const parsed = JSON.parse(raw);
                sendEvent(res, "token", { text: JSON.stringify(parsed) });
                sendEvent(res, "done", null);
                return res.end();
            }
            // CODE
            if (decision.tool === "code") {
                await streamGemini(trimmedMessage, CODE_SYSTEM_PROMPT, res, history);
                sendEvent(res, "done", null);
                return res.end();
            }
            // SEARCH
            if (decision.tool === "search") {
                if (!tavilyApiKey)
                    throw new Error("Search is not configured");
                const client = tavily({ apiKey: tavilyApiKey });
                const searchResponse = await client.search(decision.extractedParams?.query ?? trimmedMessage, { maxResults: 5 });
                const context = (searchResponse.results ?? [])
                    .map((r, i) => `[${i + 1}] ${r.title}\nURL: ${r.url}\n${(r.content ?? "").slice(0, 600)}`)
                    .join("\n\n");
                if (!context) {
                    sendEvent(res, "reply", { text: "No results found for your query." });
                    sendEvent(res, "done", null);
                    return res.end();
                }
                const searchPrompt = `User question:
${trimmedMessage}

Search results:
${context}`;
                await streamGemini(searchPrompt, SEARCH_SYSTEM_PROMPT, res, history);
                sendEvent(res, "done", null);
                return res.end();
            }
            // IMAGE
            if (decision.tool === "image") {
                const imagePrompt = await generateGeminiText(decision.extractedParams?.query ?? trimmedMessage, IMAGE_PROMPT_REWRITER_SYSTEM_PROMPT);
                const result = await generateImage(imagePrompt);
                sendEvent(res, "image", { url: result.output.imageUrl });
                res.write("data: [DONE]\n\n");
                return res.end();
            }
            // SLIDES
            if (decision.tool === "slides") {
                sendEvent(res, "reply", { text: "Generating your slides, this takes about 30 seconds..." });
                const slidesBrief = await generateGeminiText(trimmedMessage, SLIDES_BRIEF_WRITER_SYSTEM_PROMPT);
                const downloadUrl = await generateSlides(slidesBrief);
                sendEvent(res, "slides", { url: downloadUrl });
                sendEvent(res, "done", null);
                return res.end();
            }
            // AGENT
            if (decision.tool === "agent") {
                await handleAgent(trimmedMessage, history ?? [], res);
                return;
            }
            // RAG
            if (decision.tool === "rag") {
                await handleRag(trimmedMessage, history ?? [], res);
                return;
            }
            // SPEAK
            if (decision.tool === "speak") {
                sendEvent(res, "reply", { text: "Use the listen button to hear this read aloud." });
                sendEvent(res, "done", null);
                return res.end();
            }
            // DEFAULT CHAT (none / fallback)
            await streamGemini(trimmedMessage, DEFAULT_CHAT_SYSTEM_PROMPT, res, history);
            sendEvent(res, "done", null);
            return res.end();
        }
        catch (err) {
            console.error("chat stream error:", err);
            sendEvent(res, "error", {
                tool: decision.tool,
                output: { chat: `Something went wrong: ${err?.message ?? "unknown error"}` },
            });
            res.write("data: [DONE]\n\n");
            res.end();
        }
    }
    catch (error) {
        console.error("fatal stream error:", error);
        res.end();
    }
});
app.post("/api/v1/ingest", async (req, res) => {
    try {
        const { id, text, metadata } = req.body;
        if (!text?.trim())
            return res.status(400).json({ error: "text is required" });
        const documentId = id?.trim() || `doc-${Date.now()}`;
        const stringMetadata = Object.fromEntries(Object.entries(metadata ?? {}).filter((entry) => typeof entry[1] === "string"));
        await ingestDocument(documentId, text, stringMetadata);
        res.json({ ok: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
app.post("/api/v1/speak", handleSpeak);
// Chat naming via Groq - fast, cheap, one-shot
app.post("/api/v1/name-chat", async (req, res) => {
    try {
        const { message } = req.body;
        if (!message?.trim())
            return res.status(400).json({ title: "New Chat" });
        const completion = await groq.chat.completions.create({
            model: groqModel,
            max_tokens: 12,
            messages: [
                {
                    role: "system",
                    content: CHAT_TITLE_SYSTEM_PROMPT,
                },
                { role: "user", content: message.slice(0, 200) },
            ],
        });
        const title = completion.choices[0]?.message?.content?.trim() ?? message.slice(0, 40);
        res.json({ title });
    }
    catch {
        res.status(500).json({ title: "New Chat" });
    }
});
// Follow-up suggestions via Groq - replaces Gemini for speed
app.post("/api/v1/suggest", async (req, res) => {
    try {
        const { message } = req.body;
        if (!message?.trim())
            return res.status(400).json({ suggestions: [] });
        const completion = await groq.chat.completions.create({
            model: groqModel,
            max_tokens: 60,
            messages: [
                {
                    role: "system",
                    content: FOLLOWUP_SYSTEM_PROMPT,
                },
                { role: "user", content: message.slice(0, 400) },
            ],
        });
        let raw = completion.choices[0]?.message?.content?.trim() ?? "[]";
        raw = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```\s*$/i, "").trim();
        const suggestions = JSON.parse(raw);
        res.json({ suggestions: Array.isArray(suggestions) ? suggestions.slice(0, 3) : [] });
    }
    catch {
        res.status(500).json({ suggestions: [] });
    }
});
app.listen(port, () => console.log(`API listening on http://localhost:${port}`));

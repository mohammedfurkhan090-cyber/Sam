import "dotenv/config";
import cors from "cors";
import { ElevenLabsClient } from "elevenlabs";
import express, { type Response } from "express";
import { groq, groqModel } from "./groq.js";
import { routeMessage } from "./router.js";

const app = express();
const port = Number(process.env.API_PORT ?? 4000);
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

type ReleaseNotesRequest = {
  repoName: string;
  mergedPrTitles: string[];
};

type UnfoldMode = "structure" | "poke" | "expand";

type UnfoldRequest = {
  thought: string;
  mode: UnfoldMode;
};

function sendEvent(res: Response, type: string, payload: unknown) {
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

function getUnfoldSystemPrompt(mode: UnfoldMode): string {
  const sharedRules = [
    "You are Unfold, a real-time thinking partner.",
    "Return ONLY valid JSON. No markdown fences. No preamble.",
    "Keep language concise and concrete.",
  ];

  if (mode === "expand") {
    return [
      ...sharedRules,
      "Return this exact schema:",
      '{"summary":"string","expansions":["string"],"blindSpots":["string"],"questions":["string"]}',
      "summary must be 1-2 sentences.",
      "expansions must include 4-6 concrete new angles.",
      "blindSpots must include 3-5 honest gaps.",
      "questions must include 4-6 open questions.",
    ].join("\n");
  }

  if (mode === "poke") {
    return [
      ...sharedRules,
      "Return this exact schema:",
      '{"summary":"string","keyPoints":["string"],"blindSpots":["string"],"questions":["string"]}',
      "summary must be 1-2 sentences.",
      "keyPoints must include 3-5 points.",
      "blindSpots must be direct and challenging.",
      "questions must be sharp and decision-forcing.",
    ].join("\n");
  }

  return [
    ...sharedRules,
    "Return this exact schema:",
    '{"summary":"string","keyPoints":["string"],"blindSpots":["string"],"questions":["string"]}',
    "summary must be 1-2 sentences.",
    "keyPoints must include 3-5 points.",
    "blindSpots must include 3-5 thoughtful gaps.",
    "questions must include 4-6 open questions.",
  ].join("\n");
}

app.post("/api/v1/release-notes", async (req, res) => {
  try {
    const body = req.body as Partial<ReleaseNotesRequest>;

    if (!body.repoName || !Array.isArray(body.mergedPrTitles)) {
      return res.status(400).json({
        error: "Invalid payload. Expected: { repoName: string, mergedPrTitles: string[] }",
      });
    }

    const prList = body.mergedPrTitles.map((title, i) => `${i + 1}. ${title}`).join("\n");

    const prompt = `
You are a release manager assistant.
Create concise release notes for repository: ${body.repoName}.

Merged PR titles:
${prList}

Output format:
- Highlights (3-5 bullets)
- Technical Changes (bullets)
- Risks / Follow-ups (bullets)
Keep it clear and practical.
    `.trim();

    const completion = await groq.chat.completions.create({
      model: groqModel,
      temperature: 0.3,
      messages: [
        { role: "system", content: "You write concise engineering release notes." },
        { role: "user", content: prompt },
      ],
    });

    const notes = completion.choices[0]?.message?.content ?? "No content generated.";

    return res.json({
      repoName: body.repoName,
      model: groqModel,
      notes,
    });
  } catch (error) {
    console.error("release-notes error:", error);
    return res.status(500).json({ error: "Failed to generate release notes" });
  }
});

app.post("/api/v1/unfold", async (req, res) => {
  const body = req.body as Partial<UnfoldRequest>;
  const thought = body.thought?.trim();
  const mode = body.mode;

  if (!thought || !mode || !["structure", "poke", "expand"].includes(mode)) {
    return res.status(400).json({
      error: 'Invalid payload. Expected: { thought: string, mode: "structure" | "poke" | "expand" }',
    });
  }

  const MAX_THOUGHT_LENGTH = 2000;
  if (thought.length > MAX_THOUGHT_LENGTH) {
    return res.status(400).json({
      error: `Thought exceeds maximum length of ${MAX_THOUGHT_LENGTH} characters.`,
    });
  }

  // SSE keeps one HTTP response open and lets us push incremental chunks.
  // If we returned JSON once at the end, the UI could only update after full completion.
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
    const stream = await groq.chat.completions.create({
      model: groqModel,
      temperature: 0.2,
      stream: true,
      messages: [
        { role: "system", content: getUnfoldSystemPrompt(mode) },
        { role: "user", content: thought },
      ],
    });

    // Groq is chosen here for low token latency, which matters because this UI
    // is designed to feel "alive" as content appears token-by-token.
    for await (const chunk of stream) {
      if (closedByClient) {
        break;
      }

      const token = chunk.choices[0]?.delta?.content;
      if (!token) {
        continue;
      }

      // We JSON-escape the token before writing so embedded newlines do not
      // corrupt SSE framing. Raw newlines would split one token into bad events.
      res.write(`data: ${JSON.stringify(token)}\n\n`);
    }

    res.write("data: [DONE]\n\n");
    return res.end();
  } catch (error) {
    console.error("unfold stream error:", error);
    res.write(`data: ${JSON.stringify("[ERROR] Failed to stream response")}\n\n`);
    res.write("data: [DONE]\n\n");
    return res.end();
  }
});

app.post("/api/v1/route", async (req, res) => {
  const { message } = req.body as { message?: string };

  if (!message?.trim()) {
    return res.status(400).json({ error: "message is required" });
  }

  if (message.length > 3000) {
    return res.status(400).json({ error: "message too long" });
  }

  try {
    const decision = await routeMessage(message);
    return res.json(decision);
  } catch (error) {
    console.error("route error:", error);
    return res.status(500).json({ error: "routing failed" });
  }
});

app.post("/api/v1/chat", async (req, res) => {
  const { message } = req.body as { message?: string };

  if (!message?.trim()) {
    return res.status(400).json({ error: "message is required" });
  }

  if (message.length > 3000) {
    return res.status(400).json({ error: "message too long" });
  }

  // One /chat endpoint lets backend orchestrate route + tool execution in one
  // round trip, instead of the frontend coordinating multiple API calls itself.
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

    // Emitting routing first helps the UI react immediately (badges, labels, etc.)
    // while execution is still starting, improving perceived responsiveness.
    sendEvent(res, "routing", decision);

    if (decision.tool === "unfold") {
      const thought = decision.extractedParams.thought ?? trimmedMessage;
      const mode = decision.extractedParams.mode ?? "structure";

      const stream = await groq.chat.completions.create({
        model: groqModel,
        temperature: 0.2,
        stream: true,
        messages: [
          { role: "system", content: getUnfoldSystemPrompt(mode) },
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

    if (decision.tool === "none") {
      // We stream even for "none" so the frontend can handle one consistent
      // SSE pattern for every chat message instead of branching to JSON logic.
      const stream = await groq.chat.completions.create({
        model: groqModel,
        temperature: 0.2,
        stream: true,
        messages: [
          {
            role: "system",
            content:
              "You are Sam, a sharp AI thinking partner built to help people think clearer and act faster. Respond naturally to greetings and questions about what you are. Keep replies under 3 sentences. Never say you don't have feelings — just stay focused on being useful.",
          },
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
      // speak wires to /api/v1/speak once frontend exists
      sendEvent(res, "reply", { text: "Use the listen button to hear text read aloud." });
      sendEvent(res, "done", null);
      return res.end();
    }

    if (decision.tool === "search") {
      // will integrate Tavily API here
      sendEvent(res, "reply", { text: "Search isn't available yet — coming soon." });
      sendEvent(res, "done", null);
      return res.end();
    }

    sendEvent(res, "error", { message: "Unsupported tool route" });
    sendEvent(res, "done", null);
    return res.end();
  } catch (error) {
    console.error("chat stream error:", error);
    if (!closedByClient) {
      sendEvent(res, "error", { message: "chat failed" });
      sendEvent(res, "done", null);
      return res.end();
    }
    return;
  }
});

app.post("/api/v1/speak", async (req, res) => {
  if (!elevenLabsApiKey) {
    return res.status(503).json({ error: "ElevenLabs not configured" });
  }

  const { text, voiceId = "JBFqnCBsd6RMkjVDRZzb" } = req.body as {
    text?: string;
    voiceId?: string;
  };

  if (!text?.trim()) {
    return res.status(400).json({ error: "text is required" });
  }

  if (text.length > 1000) {
    return res.status(400).json({ error: "text exceeds 1000 characters" });
  }

  try {
    const client = new ElevenLabsClient({ apiKey: elevenLabsApiKey });

    const audioStream = await client.textToSpeech.convert(voiceId, {
      text: text.trim(),
      model_id: "eleven_turbo_v2_5",
      output_format: "mp3_44100_128",
    });

    // Stream audio bytes directly to the client.
    // We proxy through the backend so the ElevenLabs API key stays
    // server-side and is never exposed to the browser.
    res.setHeader("Content-Type", "audio/mpeg");
    res.setHeader("Transfer-Encoding", "chunked");

    for await (const chunk of audioStream) {
      res.write(chunk);
    }

    return res.end();
  } catch (error) {
    console.error("speak error:", error);
    return res.status(500).json({ error: "TTS failed" });
  }
});

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});

/*
Manual test record for POST /api/v1/chat (May 5, 2026):

Command 1:
$body = '{"message":"I want to think through whether I should learn Rust or Go next"}'
Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/v1/chat" -ContentType "application/json" -Body $body

Raw output:
data: {"type":"routing","payload":{"tool":"unfold","confidence":"high","extractedParams":{"thought":"whether I should learn Rust or Go next","mode":"structure"},"reasoning":"The user is seeking to analyze and structure their thoughts on choosing between learning Rust and Go, indicating a need for the unfold tool to help organize their decision-making process."}}
data: {"type":"token","payload":{"text":"{\""}}
data: {"type":"token","payload":{"text":"summary"}}
data: {"type":"token","payload":{"text":"\":\""}}
... token stream omitted for brevity ...
data: {"type":"token","payload":{"text":"\"]}"}}
data: {"type":"done","payload":null}

Command 2:
$body = '{"message":"Hey Sam, how are you?"}'
Invoke-RestMethod -Method POST -Uri "http://localhost:4000/api/v1/chat" -ContentType "application/json" -Body $body

Raw output:
data: {"type":"routing","payload":{"tool":"none","confidence":"high","extractedParams":{},"reasoning":"The user is asking a greeting question about Sam, which does not fit into any of the other tool categories."}}
data: {"type":"reply","payload":{"text":"I"}}
data: {"type":"reply","payload":{"text":"'m"}}
data: {"type":"reply","payload":{"text":" doing"}}
... reply stream omitted for brevity ...
data: {"type":"reply","payload":{"text":"."}}
data: {"type":"done","payload":null}
*/


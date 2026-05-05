import "dotenv/config";
import cors from "cors";
import { ElevenLabsClient } from "elevenlabs";
import express from "express";
import { groq, groqModel } from "./groq.js";

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

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "releaseforge-api-lab" });
});

app.get("/api/v1/status", (_req, res) => {
  res.json({
    name: "ReleaseForge-Lab",
    phase: "learning-day-1",
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


import { type Request, type Response } from "express";
import { groq, groqModel } from "../groq.js";

export type UnfoldMode = "structure" | "poke" | "expand";

type UnfoldRequest = {
  thought: string;
  mode: UnfoldMode;
};

export function getUnfoldSystemPrompt(mode: UnfoldMode): string {
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

function isUnfoldMode(value: unknown): value is UnfoldMode {
  return value === "structure" || value === "poke" || value === "expand";
}

export async function handleUnfold(req: Request, res: Response): Promise<Response | void> {
  const body = req.body as Partial<UnfoldRequest>;
  const thought = body.thought?.trim();
  const mode = body.mode;

  if (!thought || !mode || !isUnfoldMode(mode)) {
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

    for await (const chunk of stream) {
      if (closedByClient) {
        break;
      }

      const token = chunk.choices[0]?.delta?.content;
      if (!token) {
        continue;
      }

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
}

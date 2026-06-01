import { type Request, type Response } from "express";
import { groq, groqModel } from "../groq.js";

export type UnfoldMode = "structure" | "poke" | "expand";

type UnfoldRequest = {
  thought: string;
  mode: UnfoldMode;
};

export function getUnfoldSystemPrompt(mode: UnfoldMode): string {
  const sharedRules = [
    "You are Sam's deep-analysis mode: a calm, sharp thinking partner.",
    "Return ONLY valid JSON. No markdown fences. No preamble.",
    "Private process before output:",
    "1. Identify the user's real objective.",
    "2. Separate facts, assumptions, constraints, and unknowns.",
    "3. Find the three weakest or vaguest parts of the idea.",
    "4. Identify the strongest objection a smart critic would raise.",
    "5. Rewrite the output to be concrete, useful, and decision-oriented.",
    "Output requirements:",
    "- summary: 1-2 sentences.",
    "- blindSpots: 3-5 specific risks, missing assumptions, or weak areas.",
    "- questions: 4-6 sharp questions that improve the user's thinking.",
    "- No generic advice.",
    "- No motivational filler.",
  ];

  if (mode === "expand") {
    return [
      ...sharedRules,
      "Return this exact schema:",
      '{"summary":"string","expansions":["string"],"blindSpots":["string"],"questions":["string"]}',
      "expansions: 4-6 concrete new angles, alternatives, or connections.",
    ].join("\n");
  }

  return [
    ...sharedRules,
    "Return this exact schema:",
    '{"summary":"string","keyPoints":["string"],"blindSpots":["string"],"questions":["string"]}',
    mode === "poke"
      ? "keyPoints: 3-5 direct critiques or decision-forcing observations."
      : "keyPoints: 3-5 concrete takeaways or structure points.",
    mode === "poke"
      ? "blindSpots must be direct and challenging without being rude."
      : "blindSpots must be thoughtful gaps, risks, or weak assumptions.",
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

import { type Request, type Response } from "express";

const STABILITY_URL = "https://api.stability.ai/v2beta/stable-image/generate/core";

export async function generateImage(prompt: string): Promise<{
  tool: string;
  output: { imageUrl: string | null; chat: string | null };
}> {
  try {
    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) throw new Error("STABILITY_API_KEY is not configured");

    const form = new FormData();
    form.append("prompt", prompt);
    form.append("output_format", "jpeg");
    form.append("aspect_ratio", "1:1");

    const response = await fetch(STABILITY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "image/*",
      },
      body: form,
      signal: AbortSignal.timeout(60000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Stability AI returned ${response.status}: ${body}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    const dataUrl = `data:image/jpeg;base64,${base64}`;

    return { tool: "image", output: { imageUrl: dataUrl, chat: null } };
  } catch (err: any) {
    return {
      tool: "image",
      output: {
        imageUrl: null,
        chat: `Image generation failed: ${err?.message ?? "unknown error"}`,
      },
    };
  }
}

export async function handleImage(req: Request, res: Response): Promise<Response | void> {
  const { prompt } = req.body as { prompt?: string };
  const trimmedPrompt = prompt?.trim();
  if (!trimmedPrompt) return res.status(400).json({ error: "prompt is required" });
  const result = await generateImage(trimmedPrompt);
  if (result.output.imageUrl) return res.json({ url: result.output.imageUrl });
  return res.status(500).json({ error: result.output.chat });
}

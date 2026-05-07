import { type Request, type Response } from "express";

const FAL_URL = "https://fal.run/fal-ai/flux/schnell";

type FalResponse = {
  images?: Array<{ url?: string }>;
};

export async function generateImage(prompt: string): Promise<string> {
  const falKey = process.env.FAL_KEY;
  if (!falKey) {
    throw new Error("FAL_KEY is not configured");
  }

  const response = await fetch(FAL_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${falKey}`,
    },
    body: JSON.stringify({
      prompt,
      image_size: "landscape_16_9",
      num_images: 1,
    }),
  });

  if (!response.ok) {
    throw new Error(`FAL request failed with status ${response.status}`);
  }

  const data = (await response.json()) as FalResponse;
  const imageUrl = data.images?.[0]?.url;
  if (!imageUrl) {
    throw new Error("FAL response missing image URL");
  }

  return imageUrl;
}

export async function handleImage(req: Request, res: Response): Promise<Response | void> {
  const { prompt } = req.body as { prompt?: string };
  const trimmedPrompt = prompt?.trim();

  if (!trimmedPrompt) {
    return res.status(400).json({ error: "prompt is required" });
  }

  try {
    const url = await generateImage(trimmedPrompt);
    return res.json({ url });
  } catch (error) {
    console.error("image tool error:", error);
    return res.status(500).json({ error: "Image generation failed" });
  }
}

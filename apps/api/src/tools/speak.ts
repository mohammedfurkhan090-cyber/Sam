import { ElevenLabsClient } from "elevenlabs";
import { type Request, type Response } from "express";

const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

// Sarah — warm, confident young adult female voice
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

export async function handleSpeak(req: Request, res: Response): Promise<Response | void> {
  if (!elevenLabsApiKey) {
    return res.status(503).json({ error: "ElevenLabs not configured" });
  }

  const { text, voiceId = DEFAULT_VOICE_ID } = req.body as {
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
}

import { ElevenLabsClient } from "elevenlabs";
const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
export async function handleSpeak(req, res) {
    if (!elevenLabsApiKey) {
        return res.status(503).json({ error: "ElevenLabs not configured" });
    }
    const { text, voiceId = "JBFqnCBsd6RMkjVDRZzb" } = req.body;
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
    }
    catch (error) {
        console.error("speak error:", error);
        return res.status(500).json({ error: "TTS failed" });
    }
}

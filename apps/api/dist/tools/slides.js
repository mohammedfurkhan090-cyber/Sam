const SLIDES_API_BASE = "https://2slides.com/api/v1";
const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS = 20;
function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}
export async function generateSlides(topic) {
    const slidesApiKey = process.env.SLIDES_API_KEY;
    if (!slidesApiKey) {
        throw new Error("SLIDES_API_KEY is not configured");
    }
    const generateResponse = await fetch(`${SLIDES_API_BASE}/slides/generate`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${slidesApiKey}`,
        },
        body: JSON.stringify({
            userInput: topic,
            themeId: "default",
        }),
    });
    if (!generateResponse.ok) {
        const body = await generateResponse.text().catch(() => "");
        throw new Error(`Slides generate request failed with status ${generateResponse.status}: ${body}`);
    }
    const generateData = (await generateResponse.json());
    const jobId = generateData.data?.jobId;
    if (!jobId) {
        throw new Error("Slides generate response missing jobId");
    }
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
        await sleep(POLL_INTERVAL_MS);
        const jobResponse = await fetch(`${SLIDES_API_BASE}/jobs/${jobId}`, {
            method: "GET",
            headers: {
                Authorization: `Bearer ${slidesApiKey}`,
            },
        });
        if (!jobResponse.ok) {
            throw new Error(`Slides job request failed with status ${jobResponse.status}`);
        }
        const jobData = (await jobResponse.json());
        const status = jobData.data?.status;
        if (status === "success") {
            const downloadUrl = jobData.data?.downloadUrl;
            if (!downloadUrl) {
                throw new Error("Slides job succeeded without downloadUrl");
            }
            return downloadUrl;
        }
        if (status === "failed") {
            throw new Error("Slides job failed");
        }
    }
    throw new Error("Slides job timed out");
}
export async function handleSlides(req, res) {
    const { topic } = req.body;
    const trimmedTopic = topic?.trim();
    if (!trimmedTopic) {
        return res.status(400).json({ error: "topic is required" });
    }
    try {
        const url = await generateSlides(trimmedTopic);
        return res.json({ url });
    }
    catch (error) {
        console.error("slides tool error:", error);
        return res.status(500).json({ error: "Slides generation failed" });
    }
}

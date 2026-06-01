// Free embeddings via Jina AI — 1M tokens/month, no credit card required
// Docs: https://jina.ai/embeddings
// Model: jina-embeddings-v2-base-en (768 dimensions — same as BAAI/bge-large-en-v1.5)
const JINA_URL = "https://api.jina.ai/v1/embeddings";
const JINA_MODEL = "jina-embeddings-v2-base-en";
export async function embedTexts(texts) {
    if (!texts.length)
        return [];
    const apiKey = process.env.JINA_API_KEY;
    if (!apiKey)
        throw new Error("JINA_API_KEY is not configured");
    const response = await fetch(JINA_URL, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: JINA_MODEL,
            input: texts.map((text) => ({ text })),
        }),
    });
    if (!response.ok) {
        const bodyText = await response.text();
        throw new Error(`Jina embeddings failed (${response.status}): ${bodyText}`);
    }
    const data = (await response.json());
    const embeddings = data.data?.map((item) => item.embedding);
    if (!embeddings || embeddings.some((e) => !e || !Array.isArray(e))) {
        throw new Error("Jina embeddings response missing embedding vectors");
    }
    return embeddings;
}
export async function embedQuery(text) {
    const vectors = await embedTexts([text]);
    const vector = vectors[0];
    if (!vector)
        throw new Error("Failed to embed query text");
    return vector;
}

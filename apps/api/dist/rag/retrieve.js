import { Pinecone } from "@pinecone-database/pinecone";
import { embedQuery } from "./embed.js";
const INDEX_NAME = "sam-memory";
function getIndex() {
    const pineconeApiKey = process.env.PINECONE_API_KEY;
    if (!pineconeApiKey) {
        throw new Error("PINECONE_API_KEY is not configured");
    }
    const client = new Pinecone({ apiKey: pineconeApiKey });
    return client.index(INDEX_NAME);
}
export async function retrieveContext(query, topK = 5) {
    const vector = await embedQuery(query);
    const index = getIndex();
    const response = await index.query({
        vector,
        topK,
        includeMetadata: true,
    });
    return response.matches
        .filter((match) => (match.score ?? 0) >= 0.5)
        .map((match) => match.metadata?.text)
        .filter((text) => typeof text === "string" && text.trim().length > 0);
}

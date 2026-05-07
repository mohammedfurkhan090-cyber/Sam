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

type MatchWithText = {
  score?: number;
  metadata?: {
    text?: string;
  };
};

export async function retrieveContext(query: string, topK = 5): Promise<string[]> {
  const vector = await embedQuery(query);
  const index = getIndex();

  const response = await index.query({
    vector,
    topK,
    includeMetadata: true,
  });

  return (response.matches as MatchWithText[])
    .filter((match) => (match.score ?? 0) >= 0.5)
    .map((match) => match.metadata?.text)
    .filter((text): text is string => typeof text === "string" && text.trim().length > 0);
}

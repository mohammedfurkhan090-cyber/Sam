import { Pinecone } from "@pinecone-database/pinecone";
import { embedTexts } from "./embed.js";

const INDEX_NAME = "sam-memory";

function getIndex() {
  const pineconeApiKey = process.env.PINECONE_API_KEY;
  if (!pineconeApiKey) {
    throw new Error("PINECONE_API_KEY is not configured");
  }
  const client = new Pinecone({ apiKey: pineconeApiKey });
  return client.index(INDEX_NAME);
}

export function chunkText(text: string, chunkSize = 500, overlap = 50): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) {
    return [];
  }

  const chunks: string[] = [];
  const step = Math.max(1, chunkSize - overlap);

  for (let start = 0; start < words.length; start += step) {
    const end = Math.min(start + chunkSize, words.length);
    const chunk = words.slice(start, end).join(" ");
    if (chunk) {
      chunks.push(chunk);
    }
    if (end >= words.length) {
      break;
    }
  }

  return chunks;
}

export async function ingestDocument(
  id: string,
  text: string,
  metadata: Record<string, string> = {},
): Promise<number> {
  const chunks = chunkText(text);
  if (!chunks.length) {
    return 0;
  }

  const embeddings = await embedTexts(chunks);
  if (embeddings.length !== chunks.length) {
    throw new Error("Embedding count does not match chunk count");
  }

  const vectors = chunks.map((chunk, i) => ({
    id: `${id}-chunk-${i}`,
    values: embeddings[i],
    metadata: {
      text: chunk,
      source: id,
      ...metadata,
    },
  }));

  const index = getIndex();
  await index.upsert({ records: vectors });

  return chunks.length;
}

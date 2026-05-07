const TOGETHER_URL = "https://api.together.xyz/v1/embeddings";
const TOGETHER_MODEL = "BAAI/bge-large-en-v1.5";

type TogetherEmbeddingResponse = {
  data?: Array<{
    embedding?: number[];
  }>;
  error?: {
    message?: string;
  };
};

export async function embedTexts(texts: string[]): Promise<number[][]> {
  if (!texts.length) {
    return [];
  }

  const togetherApiKey = process.env.TOGETHER_API_KEY;
  if (!togetherApiKey) {
    throw new Error("TOGETHER_API_KEY is not configured");
  }

  const response = await fetch(TOGETHER_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${togetherApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: TOGETHER_MODEL,
      input: texts,
    }),
  });

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(`Together embeddings failed (${response.status}): ${bodyText}`);
  }

  const data = (await response.json()) as TogetherEmbeddingResponse;
  const embeddings = data.data?.map((item) => item.embedding);
  if (!embeddings || embeddings.some((embedding) => !embedding || !Array.isArray(embedding))) {
    throw new Error("Together embeddings response missing embedding vectors");
  }

  return embeddings as number[][];
}

export async function embedQuery(text: string): Promise<number[]> {
  const vectors = await embedTexts([text]);
  const vector = vectors[0];
  if (!vector) {
    throw new Error("Failed to embed query text");
  }
  return vector;
}

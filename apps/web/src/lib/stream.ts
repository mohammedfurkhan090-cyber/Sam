import type { ThoughtMode } from "./prompts";

type StreamArgs = {
  thought: string;
  mode: ThoughtMode;
  signal?: AbortSignal;
  onToken: (token: string) => void;
  onDone: () => void;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

export async function streamUnfold({ thought, mode, signal, onToken, onDone }: StreamArgs): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/unfold`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ thought, mode }),
    signal,
  });

  if (!response.ok) {
    const reason = await response.text();
    throw new Error(reason || "Streaming request failed");
  }

  if (!response.body) {
    throw new Error("No response stream available from backend");
  }

  // We read from the low-level stream API to show each token immediately.
  // Waiting for response.json() would block until completion and kill live UX.
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // TextDecoder with stream:true preserves multi-byte characters that may
      // split across chunks; decoding per chunk without this can corrupt text.
      buffer += decoder.decode(value, { stream: true });

      let boundaryIndex = buffer.indexOf("\n\n");
      while (boundaryIndex !== -1) {
        const rawEvent = buffer.slice(0, boundaryIndex);
        buffer = buffer.slice(boundaryIndex + 2);

        const dataLines = rawEvent
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trim());

        for (const data of dataLines) {
          if (!data) {
            continue;
          }

          if (data === "[DONE]") {
            onDone();
            return;
          }

          const token = decodeSseToken(data);
          onToken(token);
        }

        boundaryIndex = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }

  onDone();
}

function decodeSseToken(dataLine: string): string {
  try {
    return JSON.parse(dataLine) as string;
  } catch {
    return dataLine;
  }
}

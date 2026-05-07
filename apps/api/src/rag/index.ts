import { type Response } from "express";
import { groq, groqModel } from "../groq.js";
import { retrieveContext } from "./retrieve.js";

type ChatHistoryItem = {
  role: "user" | "assistant";
  content: string;
};

function sendEvent(res: Response, type: string, payload: unknown) {
  res.write(`data: ${JSON.stringify({ type, payload })}\n\n`);
}

export async function handleRag(
  message: string,
  history: ChatHistoryItem[],
  res: Response,
): Promise<void> {
  const chunks = await retrieveContext(message, 5);
  if (!chunks.length) {
    sendEvent(res, "reply", { text: "I don't have any documents on that yet." });
    sendEvent(res, "done", null);
    res.end();
    return;
  }

  const systemPrompt = [
    "You are Sam. Answer using ONLY the context below. If the answer isn't in the context, say so.",
    "Context:",
    chunks.join("\n\n"),
  ].join("\n");

  const stream = await groq.chat.completions.create({
    model: groqModel,
    temperature: 0.2,
    stream: true,
    messages: [
      { role: "system", content: systemPrompt },
      ...history.slice(-6),
      { role: "user", content: message },
    ],
  });

  for await (const chunk of stream) {
    const token = chunk.choices[0]?.delta?.content;
    if (!token) {
      continue;
    }
    sendEvent(res, "reply", { text: token });
  }

  sendEvent(res, "done", null);
  res.end();
}

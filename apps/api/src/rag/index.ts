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

function buildRagSystemPrompt(context: string): string {
  return [
    "You are Sam in document-grounded mode.",
    "You must answer using ONLY the document context below.",
    "Conversation history may only be used to understand follow-up references, not as factual evidence.",
    "Rules:",
    '- If the answer is not in the context, say: "I don\'t have that in the provided documents."',
    "- Do not invent facts, filenames, authors, dates, conclusions, or citations.",
    "- If context is partial, say what is known and what is missing.",
    "- If context conflicts, point out the conflict.",
    "- Prefer synthesis over long quotations.",
    "- Quote short phrases only when necessary.",
    "Answer format:",
    "- Direct answer first.",
    "- Supporting details from the documents.",
    "- Missing information or uncertainty, if relevant.",
    "- Suggested next step, if useful.",
    "Document context:",
    context,
  ].join("\n");
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

  const systemPrompt = buildRagSystemPrompt(chunks.join("\n\n"));

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

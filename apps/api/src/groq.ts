import Groq from "groq-sdk";

const groqApiKey = process.env.GROQ_API_KEY;

if (!groqApiKey) {
  throw new Error("Missing GROQ_API_KEY in apps/api/.env");
}

export const groq = new Groq({
  apiKey: groqApiKey,
});

export const groqModel = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

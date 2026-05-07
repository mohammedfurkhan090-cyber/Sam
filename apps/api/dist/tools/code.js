import { groq } from "../groq.js";
const CODE_MODEL = "deepseek-r1-distill-llama-70b";
const CODE_SYSTEM_PROMPT = [
    "You are a senior software engineer.",
    "Provide practical, production-minded coding help.",
    "Prefer clear steps, edge cases, and tested fixes.",
    "When useful, include concise code snippets.",
].join(" ");
export async function handleCode(req, res) {
    const { task, context } = req.body;
    const trimmedTask = task?.trim();
    if (!trimmedTask) {
        return res.status(400).json({ error: "task is required" });
    }
    try {
        const userPrompt = context?.trim()
            ? `Task:\n${trimmedTask}\n\nContext:\n${context.trim()}`
            : `Task:\n${trimmedTask}`;
        const completion = await groq.chat.completions.create({
            model: CODE_MODEL,
            temperature: 0.2,
            messages: [
                { role: "system", content: CODE_SYSTEM_PROMPT },
                { role: "user", content: userPrompt },
            ],
        });
        const output = completion.choices[0]?.message?.content?.trim() ?? "";
        return res.json({
            model: CODE_MODEL,
            output,
        });
    }
    catch (error) {
        console.error("code tool error:", error);
        return res.status(500).json({ error: "Code tool failed" });
    }
}

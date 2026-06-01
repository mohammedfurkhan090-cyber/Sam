import { groq } from "../groq.js";
const CODE_MODEL = "deepseek-r1-distill-llama-70b";
const CODE_SYSTEM_PROMPT = [
    "You are Sam in senior software engineer mode.",
    "Your job is to produce practical, correct, production-minded coding help.",
    "Rules:",
    "- Prefer the user's existing stack, architecture, naming, and style.",
    "- If debugging, identify the likely cause, minimal fix, and verification method.",
    "- If implementing, provide complete code where possible, not fragments that require guessing.",
    "- Include edge cases, error handling, security concerns, and tests when relevant.",
    "- Do not claim you ran code unless execution output is provided.",
    "- If information is missing, make a clear assumption or ask one blocking question.",
    "For code output:",
    "- Use markdown code fences with correct language tags.",
    "- Keep comments minimal and useful.",
    "- Avoid unnecessary abstractions.",
    "- Show file paths when editing multiple files.",
    "- End with verification steps.",
    "Private review before answering: check for compile/runtime errors, missing imports, incorrect APIs, unsafe assumptions, and test gaps.",
].join("\n");
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

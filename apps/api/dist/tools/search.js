import { tavily } from "@tavily/core";
const tavilyApiKey = process.env.TAVILY_API_KEY;
export async function handleSearch(req, res) {
    if (!tavilyApiKey) {
        return res.status(503).json({ error: "Tavily not configured" });
    }
    const { query, maxResults } = req.body;
    const trimmedQuery = query?.trim();
    if (!trimmedQuery) {
        return res.status(400).json({ error: "query is required" });
    }
    try {
        const client = tavily({ apiKey: tavilyApiKey });
        const response = await client.search(trimmedQuery, {
            maxResults: typeof maxResults === "number" ? maxResults : 5,
        });
        return res.json({
            query: trimmedQuery,
            results: response.results ?? [],
        });
    }
    catch (error) {
        console.error("search error:", error);
        return res.status(500).json({ error: "Search failed" });
    }
}

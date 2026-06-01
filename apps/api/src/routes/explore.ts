import { Router } from "express";
import Groq from "groq-sdk";

const router = Router();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY! });

// ─── Static data ────────────────────────────────────────────────────────────

export const TOOLS = [
  {
    id: "search",
    name: "Web Search",
    description: "Search the web for current facts, news, prices, and real-time information.",
    icon: "Search",
    category: "Research",
    badge: "Popular",
    color: "rgba(59,130,246,0.15)",
    borderColor: "rgba(59,130,246,0.25)",
    iconColor: "#60A5FA",
    examplePrompts: [
      "What are the latest AI model releases this week?",
      "Current price of NVIDIA stock",
      "Who won the F1 race last weekend?",
      "Latest news about OpenAI",
    ],
  },
  {
    id: "image",
    name: "Image Generator",
    description: "Create stunning visuals, art, and designs from a text description.",
    icon: "Image",
    category: "Creative",
    badge: "Popular",
    color: "rgba(239,68,68,0.15)",
    borderColor: "rgba(239,68,68,0.25)",
    iconColor: "#F87171",
    examplePrompts: [
      "A futuristic city at sunset with flying cars",
      "Minimalist logo design for a tech startup",
      "Portrait of a samurai in a neon-lit Tokyo alley",
      "Abstract wallpaper in deep space gold palette",
    ],
  },
  {
    id: "code",
    name: "Code Interpreter",
    description: "Write, debug, review, and explain code across any language or framework.",
    icon: "Code",
    category: "Development",
    badge: null,
    color: "rgba(34,197,94,0.15)",
    borderColor: "rgba(34,197,94,0.25)",
    iconColor: "#4ADE80",
    examplePrompts: [
      "Build a REST API endpoint in Express with TypeScript",
      "Debug this Python function — it's returning wrong values",
      "Explain how async/await works with examples",
      "Review my React component for performance issues",
    ],
  },
  {
    id: "unfold",
    name: "Deep Analysis",
    description: "Think through complex ideas, stress-test decisions, and get structured insights.",
    icon: "Brain",
    category: "Productivity",
    badge: null,
    color: "rgba(168,85,247,0.15)",
    borderColor: "rgba(168,85,247,0.25)",
    iconColor: "#C084FC",
    examplePrompts: [
      "Unfold my plan to launch a SaaS product in 90 days",
      "Stress-test my decision to switch careers to AI engineering",
      "Critique my business model — find the blind spots",
      "Expand on the second-order effects of remote work",
    ],
  },
  {
    id: "slides",
    name: "Slides Creator",
    description: "Generate professional PowerPoint presentations from a brief description.",
    icon: "Presentation",
    category: "Productivity",
    badge: "New",
    color: "rgba(251,146,60,0.15)",
    borderColor: "rgba(251,146,60,0.25)",
    iconColor: "#FB923C",
    examplePrompts: [
      "Create a 10-slide pitch deck for a mobile app startup",
      "Make a product launch presentation for a new AI tool",
      "Generate a quarterly business review deck",
      "Build a beginner's guide to machine learning slides",
    ],
  },
  {
    id: "rag",
    name: "File Analyzer",
    description: "Analyze, summarize, and query your uploaded documents, PDFs, and notes.",
    icon: "FileText",
    category: "Research",
    badge: null,
    color: "rgba(234,179,8,0.15)",
    borderColor: "rgba(234,179,8,0.25)",
    iconColor: "#FACC15",
    examplePrompts: [
      "Summarize my uploaded research paper",
      "Extract the key action items from this document",
      "What does my contract say about termination clauses?",
      "Compare these two documents and find differences",
    ],
  },
  {
    id: "speak",
    name: "Voice Output",
    description: "Convert any text or response into natural-sounding speech audio.",
    icon: "Volume2",
    category: "Creative",
    badge: null,
    color: "rgba(20,184,166,0.15)",
    borderColor: "rgba(20,184,166,0.25)",
    iconColor: "#2DD4BF",
    examplePrompts: [
      "Read this paragraph aloud in a calm voice",
      "Narrate a short story about space exploration",
      "Convert my essay to an audio file",
      "Read me the summary of today's news",
    ],
  },
  {
    id: "agent",
    name: "Agent Mode",
    description: "Multi-step autonomous tasks combining search, analysis, code, and output.",
    icon: "Zap",
    category: "Development",
    badge: "New",
    color: "rgba(212,160,23,0.15)",
    borderColor: "rgba(212,160,23,0.30)",
    iconColor: "#D4A017",
    examplePrompts: [
      "Research the top 5 AI coding tools and make a comparison deck",
      "Search recent ML papers and summarize the key findings",
      "Analyze my uploaded data and create a visualization",
      "Research competitors and write a positioning strategy",
    ],
  },
];

export const TEMPLATES = [
  // Research
  {
    id: "t1",
    title: "Competitor Research",
    description: "Analyze top competitors in any market with structured insights.",
    tool: "agent",
    category: "Research",
    prompt: "Research the top 5 competitors in [your market]. For each: product overview, pricing, strengths, weaknesses, and differentiation opportunity. Structure as a comparison table.",
  },
  {
    id: "t2",
    title: "News Briefing",
    description: "Get a structured briefing on any topic from today's web.",
    tool: "search",
    category: "Research",
    prompt: "Give me a structured briefing on the latest developments in [topic]. Include: top 5 news items, key trends, and what to watch next.",
  },
  {
    id: "t3",
    title: "Document Summary",
    description: "Extract key points and action items from any document.",
    tool: "rag",
    category: "Research",
    prompt: "Summarize my uploaded document. Include: main thesis, 5 key points, important data, and a list of action items.",
  },
  // Creative
  {
    id: "t4",
    title: "Product Mockup",
    description: "Visualize product concepts, UI screens, or brand assets.",
    tool: "image",
    category: "Creative",
    prompt: "Generate a clean product mockup of [describe your product]. Style: minimal, modern, white background, professional photography lighting.",
  },
  {
    id: "t5",
    title: "Brand Identity",
    description: "Create logo concepts and visual brand elements.",
    tool: "image",
    category: "Creative",
    prompt: "Design a minimalist logo for [company name], a [type of company]. Colors: [your palette]. Style: modern, geometric, scalable.",
  },
  // Productivity
  {
    id: "t6",
    title: "Pitch Deck",
    description: "Generate a full investor pitch deck from your idea.",
    tool: "slides",
    category: "Productivity",
    prompt: "Create a 12-slide investor pitch deck for [startup name]: [one-line description]. Include: problem, solution, market size, product, business model, traction, team, and ask.",
  },
  {
    id: "t7",
    title: "Decision Analysis",
    description: "Stress-test any major decision with structured thinking.",
    tool: "unfold",
    category: "Productivity",
    prompt: "Unfold my decision to [decision]. Identify: key assumptions, risks, blind spots, second-order effects, and the strongest argument against it.",
  },
  {
    id: "t8",
    title: "Project Roadmap",
    description: "Build a detailed execution plan for any project.",
    tool: "unfold",
    category: "Productivity",
    prompt: "Create a structured 90-day roadmap for [project]. Break into: week 1-2 foundation, month 1 milestones, month 2 execution, month 3 delivery. Include risks and dependencies.",
  },
  // Development
  {
    id: "t9",
    title: "API Design",
    description: "Design clean REST or GraphQL APIs with best practices.",
    tool: "code",
    category: "Development",
    prompt: "Design a REST API for [describe your system]. Include: endpoint definitions, request/response schemas, auth strategy, error handling, and rate limiting approach.",
  },
  {
    id: "t10",
    title: "Code Review",
    description: "Get a senior engineer review of any code.",
    tool: "code",
    category: "Development",
    prompt: "Review this code as a senior engineer: [paste code]. Cover: correctness, performance, security issues, edge cases, and specific improvements.",
  },
  {
    id: "t11",
    title: "Debug Session",
    description: "Systematic debugging with root cause analysis.",
    tool: "code",
    category: "Development",
    prompt: "Help me debug this issue: [describe problem]. Error: [paste error]. Code: [paste relevant code]. Find: root cause, minimal fix, and how to prevent recurrence.",
  },
  // Research
  {
    id: "t12",
    title: "Learning Roadmap",
    description: "Build a personalized learning plan for any skill.",
    tool: "unfold",
    category: "Research",
    prompt: "Create a learning roadmap to become proficient in [skill] within [timeframe]. I currently know: [your level]. Include: resources, milestones, and weekly schedule.",
  },
];

export const CATEGORIES = [
  { id: "all", label: "All", count: TOOLS.length },
  { id: "Research", label: "Research", count: TOOLS.filter(t => t.category === "Research").length },
  { id: "Creative", label: "Creative", count: TOOLS.filter(t => t.category === "Creative").length },
  { id: "Productivity", label: "Productivity", count: TOOLS.filter(t => t.category === "Productivity").length },
  { id: "Development", label: "Development", count: TOOLS.filter(t => t.category === "Development").length },
];

// ─── Routes ─────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/explore
 * Returns all tools, templates, and categories.
 * Frontend uses this to render the full Explore page.
 */
router.get("/", (_req, res) => {
  res.json({
    tools: TOOLS,
    templates: TEMPLATES,
    categories: CATEGORIES,
  });
});

/**
 * GET /api/v1/explore/tools/:id
 * Returns a single tool with full detail.
 */
router.get("/tools/:id", (req, res) => {
  const tool = TOOLS.find(t => t.id === req.params.id);
  if (!tool) return res.status(404).json({ error: "Tool not found" });
  res.json(tool);
});

/**
 * GET /api/v1/explore/search?q=query
 * Filters tools and templates by keyword.
 */
router.get("/search", (req, res) => {
  const q = (req.query.q as string ?? "").toLowerCase().trim();
  if (!q) return res.json({ tools: TOOLS, templates: TEMPLATES });

  const tools = TOOLS.filter(
    t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
  );
  const templates = TEMPLATES.filter(
    t =>
      t.title.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      t.category.toLowerCase().includes(q)
  );
  res.json({ tools, templates });
});

/**
 * POST /api/v1/explore/starter
 * Body: { toolId: string, context?: string }
 * Uses Groq to generate a personalized starter prompt for a tool.
 * This is the "Use now" button — it makes the prompt feel personal.
 */
router.post("/starter", async (req, res) => {
  const { toolId, context } = req.body as { toolId: string; context?: string };
  const tool = TOOLS.find(t => t.id === toolId);
  if (!tool) return res.status(404).json({ error: "Tool not found" });

  const systemPrompt = [
    "Generate one specific, ready-to-use starter prompt for the given Sam AI tool.",
    "Return ONLY the prompt text. No explanation. No markdown. No quotes.",
    "Make it specific and actionable — not generic.",
    "If context is provided, personalize the prompt to that context.",
    "Keep it under 80 words.",
  ].join(" ");

  const userMessage = context
    ? `Tool: ${tool.name} (${tool.description}). User context: ${context}`
    : `Tool: ${tool.name} (${tool.description}). Generate a powerful example prompt.`;

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      max_tokens: 120,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage },
      ],
    });
    const prompt = completion.choices[0]?.message?.content?.trim() ?? tool.examplePrompts[0];
    res.json({ prompt });
  } catch {
    res.json({ prompt: tool.examplePrompts[0] });
  }
});

export default router;

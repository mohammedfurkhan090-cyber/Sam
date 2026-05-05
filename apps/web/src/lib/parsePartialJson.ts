export type ParsedBreakdown = {
  summary: string;
  keyPoints: string[];
  expansions: string[];
  blindSpots: string[];
  questions: string[];
};

export type PartialBreakdown = Partial<ParsedBreakdown>;

const arrayFields = ["keyPoints", "expansions", "blindSpots", "questions"] as const;

type ArrayField = (typeof arrayFields)[number];

export function parsePartialJson(rawText: string): PartialBreakdown {
  const candidate = extractJsonCandidate(rawText);
  if (!candidate) {
    return {};
  }

  const complete = parseCompleteJson(candidate);
  if (complete) {
    return complete;
  }

  const partial: PartialBreakdown = {};
  const summary = extractStringField(candidate, "summary");
  if (summary !== undefined) {
    partial.summary = summary;
  }

  for (const field of arrayFields) {
    const items = extractStringArrayField(candidate, field);
    if (items !== undefined) {
      (partial as Record<ArrayField, string[]>)[field] = items;
    }
  }

  return partial;
}

function extractJsonCandidate(rawText: string): string {
  const withoutFence = rawText.replace(/```json|```/gi, "").trim();
  const firstBrace = withoutFence.indexOf("{");
  return firstBrace === -1 ? "" : withoutFence.slice(firstBrace);
}

function parseCompleteJson(candidate: string): PartialBreakdown | null {
  const lastBrace = candidate.lastIndexOf("}");
  if (lastBrace === -1) {
    return null;
  }

  const jsonSlice = candidate.slice(0, lastBrace + 1);

  try {
    const parsed = JSON.parse(jsonSlice) as Record<string, unknown>;
    return normalizeParsed(parsed);
  } catch {
    return null;
  }
}

function normalizeParsed(input: Record<string, unknown>): PartialBreakdown {
  const normalized: PartialBreakdown = {};

  if (typeof input.summary === "string") {
    normalized.summary = input.summary;
  }

  for (const field of arrayFields) {
    if (Array.isArray(input[field])) {
      (normalized as Record<ArrayField, string[]>)[field] = input[field].filter(
        (item): item is string => typeof item === "string",
      );
    }
  }

  return normalized;
}

function extractStringField(source: string, key: string): string | undefined {
  const keyIndex = source.indexOf(`"${key}"`);
  if (keyIndex === -1) {
    return undefined;
  }

  const colonIndex = source.indexOf(":", keyIndex);
  if (colonIndex === -1) {
    return undefined;
  }

  const firstQuote = source.indexOf('"', colonIndex);
  if (firstQuote === -1) {
    return undefined;
  }

  let cursor = firstQuote + 1;
  let escaped = false;
  let value = "";

  while (cursor < source.length) {
    const char = source[cursor];

    if (escaped) {
      value += decodeEscapeChar(char);
      escaped = false;
      cursor += 1;
      continue;
    }

    if (char === "\\") {
      escaped = true;
      cursor += 1;
      continue;
    }

    if (char === '"') {
      return value;
    }

    value += char;
    cursor += 1;
  }

  return value;
}

function extractStringArrayField(source: string, key: string): string[] | undefined {
  const keyIndex = source.indexOf(`"${key}"`);
  if (keyIndex === -1) {
    return undefined;
  }

  const bracketIndex = source.indexOf("[", keyIndex);
  if (bracketIndex === -1) {
    return undefined;
  }

  const items: string[] = [];
  let current = "";
  let cursor = bracketIndex + 1;
  let inString = false;
  let escaped = false;

  while (cursor < source.length) {
    const char = source[cursor];

    if (!inString && char === "]") {
      return items;
    }

    if (!inString && char === '"') {
      inString = true;
      current = "";
      cursor += 1;
      continue;
    }

    if (inString) {
      if (escaped) {
        current += decodeEscapeChar(char);
        escaped = false;
        cursor += 1;
        continue;
      }

      if (char === "\\") {
        escaped = true;
        cursor += 1;
        continue;
      }

      if (char === '"') {
        items.push(current);
        inString = false;
        cursor += 1;
        continue;
      }

      current += char;
    }

    cursor += 1;
  }

  // Returning collected items on incomplete JSON enables partial hydration during stream.
  return items;
}

function decodeEscapeChar(char: string): string {
  if (char === "n") {
    return "\n";
  }

  if (char === "t") {
    return "\t";
  }

  if (char === "r") {
    return "\r";
  }

  return char;
}

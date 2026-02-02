export function parseKeywords(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function parseChannels(raw: string): string[] {
  return raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

export function buildKeywordQuery(keywords: string[]): string {
  return keywords.join(" OR ");
}

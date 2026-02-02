const CONTROL_CHARS = /[\u0000-\u001F\u007F]/g;

export function sanitizeText(input: string, maxLength: number): string {
  const stripped = input.replace(CONTROL_CHARS, "").trim();
  if (stripped.length <= maxLength) {
    return stripped;
  }
  return stripped.slice(0, maxLength);
}

export function sanitizeUrl(input: string, maxLength: number): string {
  const sanitized = sanitizeText(input, maxLength);
  try {
    const url = new URL(sanitized);
    return url.toString();
  } catch {
    return "";
  }
}

export function safeJsonStringify(value: unknown): string {
  return JSON.stringify(value, (_key, val) => {
    if (typeof val === "string") {
      return val.replace(CONTROL_CHARS, "");
    }
    return val;
  });
}

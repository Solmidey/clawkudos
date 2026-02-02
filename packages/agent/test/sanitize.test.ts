import { describe, expect, it } from "vitest";
import { sanitizeText, sanitizeUrl } from "../src/util/sanitize.js";

describe("sanitize", () => {
  it("strips control characters and trims", () => {
    const input = "hello\u0000 world\n";
    expect(sanitizeText(input, 100)).toBe("hello world");
  });

  it("rejects invalid urls", () => {
    expect(sanitizeUrl("not a url", 100)).toBe("");
  });
});

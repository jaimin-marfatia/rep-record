import { describe, expect, it } from "vitest";
import { isShareToken, newShareToken, shareDisplayName, shareUrl } from "@/lib/share";

describe("share links", () => {
  it("accepts only 8–64 letters and numbers as a link token", () => {
    expect(isShareToken("abcd1234")).toBe(true);
    expect(isShareToken("a".repeat(64))).toBe(true);
    expect(isShareToken("abc123")).toBe(false);
    expect(isShareToken("a".repeat(65))).toBe(false);
    expect(isShareToken("abcd-1234")).toBe(false);
    expect(isShareToken("abcd1234' or 1=1")).toBe(false);
  });

  it("issues a new valid, different token each time", () => {
    const a = newShareToken();
    const b = newShareToken();
    expect(a).toHaveLength(16);
    expect(isShareToken(a)).toBe(true);
    expect(a).not.toBe(b);
  });

  it("builds the public link under /s/", () => {
    expect(shareUrl("https://muscle-milestone-log.lovable.app", "abcd1234")).toBe("https://muscle-milestone-log.lovable.app/s/abcd1234");
  });

  it("shows the first name on the share card", () => {
    expect(shareDisplayName(" Jaimin ")).toBe("Jaimin");
    expect(shareDisplayName("")).toBe("My training");
    expect(shareDisplayName(null)).toBe("My training");
  });
});

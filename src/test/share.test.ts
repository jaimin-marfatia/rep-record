import { describe, expect, it } from "vitest";
import { isShareToken, newShareToken, PUBLISHED_ORIGIN, publicShareOrigin, shareDisplayName, shareUrl } from "@/lib/share";

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

describe("public link address", () => {
  it("uses the live site when the link is made from the preview", () => {
    expect(publicShareOrigin("https://id-preview--c446a5c2-3d18-4c39-89e7-c214f604ea5a.lovable.app")).toBe(PUBLISHED_ORIGIN);
    expect(publicShareOrigin("https://c446a5c2-3d18-4c39-89e7-c214f604ea5a.lovableproject.com")).toBe(PUBLISHED_ORIGIN);
    expect(publicShareOrigin("http://localhost:8080")).toBe(PUBLISHED_ORIGIN);
  });

  it("keeps the current address on the live site or a custom domain", () => {
    expect(publicShareOrigin("https://muscle-milestone-log.lovable.app")).toBe("https://muscle-milestone-log.lovable.app");
    expect(publicShareOrigin("https://ironlog.example.com")).toBe("https://ironlog.example.com");
  });
});

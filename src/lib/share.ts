/** Share-link rules shared by the share page and the public reader. Pure functions only. */

const TOKEN_RE = /^[a-zA-Z0-9]{8,64}$/;

/** Public links only accept 8–64 letters/numbers; anything else is rejected before any lookup. */
export function isShareToken(token: string): boolean {
  return TOKEN_RE.test(token);
}

/** A fresh 16-character token; issuing one makes the previous link stop working. */
export function newShareToken(): string {
  return crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}

export function shareUrl(origin: string, token: string): string {
  return `${origin}/s/${token}`;
}

/** Name on the share card: the owner's first name, or a neutral fallback. */
export function shareDisplayName(firstName: string | null | undefined): string {
  return firstName?.trim() || "My training";
}

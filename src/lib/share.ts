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

/** The live site address — shared links always point here when made from a preview. */
export const PUBLISHED_ORIGIN = "https://muscle-milestone-log.lovable.app";

const PREVIEW_SUFFIXES = [".lovable.app", ".gpt-eng.com", ".gptengineer.run"];

/** True for editor/preview hosts, which visitors can't open without a Lovable sign-in. */
export function isPreviewHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (host.endsWith(".lovableproject.com") || host.endsWith(".lovableproject-dev.com")) return true;
  const suffix = PREVIEW_SUFFIXES.find((s) => host.endsWith(s));
  if (!suffix) return false;
  const labels = host.slice(0, -suffix.length).split(".");
  const first = labels[0] ?? "";
  if (/^(?:id-preview|preview)(?:-[a-z0-9]+)?--.+$/.test(first)) return true;
  if (/^live--[0-9a-f-]{36}(?:-thr_[a-z0-9]+)?$/.test(first) && labels.length === 2) return true;
  if (/^project--.+-dev$/.test(first)) return true;
  return false;
}

/** Origin to put in a share link: the current site, unless it's a preview — then the live site. */
export function publicShareOrigin(currentOrigin: string): string {
  try {
    return isPreviewHost(new URL(currentOrigin).hostname) ? PUBLISHED_ORIGIN : currentOrigin;
  } catch {
    return PUBLISHED_ORIGIN;
  }
}

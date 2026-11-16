/** Account rules shared by the sign-up/sign-in pages and the server. Pure functions only. */

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 20;
export const PASSWORD_MIN = 6;
export const PASSWORD_MAX = 72;
export const NAME_MAX = 50;

/** Usernames sign in to auth as a synthetic, never-emailed address on this domain. */
export const USERNAME_EMAIL_DOMAIN = "users.ironlog.local";

const USERNAME_RE = /^[a-z0-9_]+$/;

/** Usernames are case-insensitive: "Jaimin" and "jaimin" are the same account. */
export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Returns an error message, or null when the (raw) username is acceptable. */
export function usernameError(raw: string): string | null {
  const u = normalizeUsername(raw);
  if (!u) return "Choose a username";
  if (u.length < USERNAME_MIN) return `Username must be at least ${USERNAME_MIN} characters`;
  if (u.length > USERNAME_MAX) return `Username must be at most ${USERNAME_MAX} characters`;
  if (!USERNAME_RE.test(u)) return "Use only letters, numbers and underscores";
  return null;
}

export function passwordError(pw: string): string | null {
  if (pw.length < PASSWORD_MIN) return `Password must be at least ${PASSWORD_MIN} characters`;
  if (pw.length > PASSWORD_MAX) return `Password must be at most ${PASSWORD_MAX} characters`;
  return null;
}

export function nameError(raw: string, label: string): string | null {
  const n = raw.trim();
  if (!n) return `Enter your ${label.toLowerCase()}`;
  if (n.length > NAME_MAX) return `${label} must be at most ${NAME_MAX} characters`;
  return null;
}

export function usernameToEmail(raw: string): string {
  return `${normalizeUsername(raw)}@${USERNAME_EMAIL_DOMAIN}`;
}

export interface SignupInput {
  firstName: string;
  lastName: string;
  username: string;
  password: string;
}

export type SignupErrors = Partial<Record<keyof SignupInput, string>>;

export function validateSignup(input: SignupInput): SignupErrors {
  const errors: SignupErrors = {};
  const f = nameError(input.firstName, "First name");
  const l = nameError(input.lastName, "Last name");
  const u = usernameError(input.username);
  const p = passwordError(input.password);
  if (f) errors.firstName = f;
  if (l) errors.lastName = l;
  if (u) errors.username = u;
  if (p) errors.password = p;
  return errors;
}

/** Same-origin path to return to after sign-in; rejects external URLs and auth pages. */
export function safeRedirectPath(p: unknown): string | undefined {
  if (typeof p !== "string" || !p) return undefined;
  try {
    const url = new URL(p, "http://x");
    if (url.origin !== "http://x") return undefined;
    const path = url.pathname + url.search;
    if (!path.startsWith("/") || path.startsWith("//")) return undefined;
    if (/^\/(auth|login|signup)(\/|\?|$)/.test(path)) return undefined;
    return path;
  } catch {
    return undefined;
  }
}

/** Sign-in failure message: never reveals whether the username exists. */
export function loginErrorMessage(authError: string): string {
  return authError.toLowerCase().includes("invalid") ? "Wrong username or password" : "Couldn't sign in. Please try again.";
}

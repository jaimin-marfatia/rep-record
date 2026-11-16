import type { CreateAccountResult } from "@/lib/create-account";

export type SignupOutcome =
  | { kind: "signed-in" }
  | { kind: "created-sign-in-manually" }
  | { kind: "field-error"; field: string; message: string }
  | { kind: "form-error"; message: string };

export const NETWORK_ERROR = "We couldn't reach the server. Check your connection and try again.";

/**
 * Creates the account then signs in. A dropped request is retried once; if the account was in
 * fact created before the drop, signing in succeeds and the user is in.
 */
export async function signUpAndSignIn(deps: {
  create: () => Promise<CreateAccountResult>;
  signIn: () => Promise<{ ok: boolean }>;
  wait?: (ms: number) => Promise<void>;
}): Promise<SignupOutcome> {
  const wait = deps.wait ?? ((ms) => new Promise<void>((r) => setTimeout(r, ms)));
  let res: CreateAccountResult | null = null;
  for (let attempt = 0; attempt < 2 && !res; attempt++) {
    try {
      res = await deps.create();
    } catch (err) {
      console.error("[signup] request failed", err);
      if ((await deps.signIn()).ok) return { kind: "signed-in" };
      if (attempt === 0) await wait(800);
    }
  }
  if (!res) return { kind: "form-error", message: NETWORK_ERROR };
  if (!res.ok) {
    return res.field ? { kind: "field-error", field: res.field, message: res.message } : { kind: "form-error", message: res.message };
  }
  return (await deps.signIn()).ok ? { kind: "signed-in" } : { kind: "created-sign-in-manually" };
}

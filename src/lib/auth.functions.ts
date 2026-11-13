import { createServerFn } from "@tanstack/react-start";
import { normalizeUsername, usernameToEmail, validateSignup, type SignupInput } from "@/lib/account";

export type CreateAccountResult = { ok: true } | { ok: false; field?: keyof SignupInput; message: string };

const TAKEN = "That username is taken — try another";

/**
 * Public: creates a username/password account. Accounts are created pre-confirmed because the
 * login email is a synthetic address derived from the username and can never receive mail.
 */
export const createAccount = createServerFn({ method: "POST" })
  .inputValidator((input: SignupInput): SignupInput => ({
    firstName: String(input?.firstName ?? "").slice(0, 200),
    lastName: String(input?.lastName ?? "").slice(0, 200),
    username: String(input?.username ?? "").slice(0, 200),
    password: String(input?.password ?? "").slice(0, 200),
  }))
  .handler(async ({ data }): Promise<CreateAccountResult> => {
    const errors = validateSignup(data);
    const first = (Object.keys(errors) as (keyof SignupInput)[])[0];
    if (first) return { ok: false, field: first, message: errors[first]! };

    const username = normalizeUsername(data.username);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing, error: lookupErr } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("username", username)
      .limit(1);
    if (lookupErr) {
      console.error("[signup] username lookup failed", lookupErr.message);
      return { ok: false, message: "Couldn't create your account. Please try again." };
    }
    if (existing && existing.length > 0) return { ok: false, field: "username", message: TAKEN };

    const { error } = await supabaseAdmin.auth.admin.createUser({
      email: usernameToEmail(username),
      password: data.password,
      email_confirm: true,
      user_metadata: {
        first_name: data.firstName.trim(),
        last_name: data.lastName.trim(),
        username,
      },
    });
    if (error) {
      // The synthetic email or the unique username index collided with a concurrent signup.
      const msg = error.message.toLowerCase();
      if (msg.includes("already") || msg.includes("database error")) {
        return { ok: false, field: "username", message: TAKEN };
      }
      console.error("[signup] createUser failed", error.message);
      return { ok: false, message: "Couldn't create your account. Please try again." };
    }
    return { ok: true };
  });

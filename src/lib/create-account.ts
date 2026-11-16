import { normalizeUsername, usernameToEmail, validateSignup, type SignupInput } from "@/lib/account";

export type CreateAccountResult = { ok: true } | { ok: false; field?: keyof SignupInput; message: string };

export const USERNAME_TAKEN = "That username is taken — try another";
export const CREATE_FAILED = "Couldn't create your account. Please try again.";

/** The slice of the admin client account creation needs (injected so the rules are testable). */
export interface AccountAdmin {
  findUsername(username: string): Promise<{ taken: boolean; error?: string }>;
  createUser(input: {
    email: string;
    password: string;
    metadata: { first_name: string; last_name: string; username: string };
  }): Promise<{ error?: string }>;
}

export async function runCreateAccount(data: SignupInput, admin: AccountAdmin): Promise<CreateAccountResult> {
  const errors = validateSignup(data);
  const first = (Object.keys(errors) as (keyof SignupInput)[])[0];
  if (first) return { ok: false, field: first, message: errors[first]! };

  const username = normalizeUsername(data.username);
  const lookup = await admin.findUsername(username);
  if (lookup.error) {
    console.error("[signup] username lookup failed", lookup.error);
    return { ok: false, message: CREATE_FAILED };
  }
  if (lookup.taken) return { ok: false, field: "username", message: USERNAME_TAKEN };

  const { error } = await admin.createUser({
    email: usernameToEmail(username),
    password: data.password,
    metadata: { first_name: data.firstName.trim(), last_name: data.lastName.trim(), username },
  });
  if (error) {
    // The synthetic email or the unique username index collided with a concurrent signup.
    const msg = error.toLowerCase();
    if (msg.includes("already") || msg.includes("database error")) {
      return { ok: false, field: "username", message: USERNAME_TAKEN };
    }
    console.error("[signup] createUser failed", error);
    return { ok: false, message: CREATE_FAILED };
  }
  return { ok: true };
}

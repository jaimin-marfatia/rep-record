import { createServerFn } from "@tanstack/react-start";
import type { SignupInput } from "@/lib/account";
import { runCreateAccount, type CreateAccountResult } from "@/lib/create-account";

export type { CreateAccountResult };

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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return runCreateAccount(data, {
      async findUsername(username) {
        const { data: rows, error } = await supabaseAdmin.from("profiles").select("id").ilike("username", username).limit(1);
        return { taken: !!rows && rows.length > 0, ...(error ? { error: error.message } : {}) };
      },
      async createUser({ email, password, metadata }) {
        const { error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: metadata });
        return error ? { error: error.message } : {};
      },
    });
  });

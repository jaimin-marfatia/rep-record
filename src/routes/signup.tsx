import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth-provider";
import { AuthLayout, Field } from "@/components/auth-layout";
import {
  NAME_MAX,
  PASSWORD_MIN,
  USERNAME_MAX,
  safeRedirectPath,
  usernameToEmail,
  validateSignup,
  type SignupErrors,
  type SignupInput,
} from "@/lib/account";
import { createAccount } from "@/lib/auth.functions";
import { signUpAndSignIn } from "@/lib/signup-flow";

export const Route = createFileRoute("/signup")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const r = safeRedirectPath(search["redirect"]);
    return r ? { redirect: r } : {};
  },
  head: () => ({
    meta: [
      { title: "Create account — IronLog" },
      { name: "description", content: "Create a free IronLog account with a username and password to start logging your workouts." },
      { property: "og:title", content: "Create account — IronLog" },
      { property: "og:description", content: "Create a free IronLog account with a username and password to start logging your workouts." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const { redirect } = Route.useSearch();
  const { session, ready } = useAuth();
  const navigate = useNavigate();
  const create = useServerFn(createAccount);
  const [form, setForm] = useState<SignupInput>({ firstName: "", lastName: "", username: "", password: "" });
  const [errors, setErrors] = useState<SignupErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (ready && session) navigate({ to: redirect ?? "/log", replace: true });
  }, [ready, session, redirect, navigate]);

  const set = (k: keyof SignupInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);
    const v = validateSignup(form);
    setErrors(v);
    if (Object.keys(v).length) return;

    setBusy(true);
    try {
      const outcome = await signUpAndSignIn({
        create: () => create({ data: form }),
        signIn: async () => {
          const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(form.username), password: form.password });
          return { ok: !error };
        },
      });
      if (outcome.kind === "field-error") setErrors({ [outcome.field]: outcome.message });
      else if (outcome.kind === "form-error") setFormError(outcome.message);
      else if (outcome.kind === "created-sign-in-manually") {
        toast.success("Account created — please sign in.");
        navigate({ to: "/login", search: redirect ? { redirect } : {} });
      } else {
        toast.success(`Welcome, ${form.firstName.trim()}!`);
        navigate({ to: redirect ?? "/log", replace: true });
      }
    } catch (err) {
      console.error("[signup] unexpected error", err);
      setFormError("Couldn't create your account. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout title="Every rep," accent="on the record." subtitle="Create your account to start logging.">
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <Field id="firstName" label="First name" autoComplete="given-name" maxLength={NAME_MAX} value={form.firstName} onChange={set("firstName")} error={errors.firstName} />
          <Field id="lastName" label="Last name" autoComplete="family-name" maxLength={NAME_MAX} value={form.lastName} onChange={set("lastName")} error={errors.lastName} />
        </div>
        <Field
          id="username"
          label="Username"
          autoComplete="username"
          autoCapitalize="none"
          spellCheck={false}
          maxLength={USERNAME_MAX}
          value={form.username}
          onChange={set("username")}
          error={errors.username}
          hint="3–20 letters, numbers or underscores. You'll use this to sign in."
        />
        <Field
          id="password"
          label="Password"
          type="password"
          autoComplete="new-password"
          value={form.password}
          onChange={set("password")}
          error={errors.password}
          hint={`At least ${PASSWORD_MIN} characters.`}
        />
        {formError ? (
          <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {formError}
          </p>
        ) : null}
        <button
          type="submit"
          disabled={busy}
          className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-primary font-bold text-primary-foreground shadow-glow disabled:opacity-70"
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null} Create account
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link to="/login" search={redirect ? { redirect } : {}} className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

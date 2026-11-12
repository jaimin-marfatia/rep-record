import { useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Dumbbell, LineChart, Share2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { GoogleButton, POST_LOGIN_KEY } from "@/components/google-button";
import { Logo } from "@/components/logo";

function safePath(p: unknown): string | undefined {
  if (typeof p !== "string") return undefined;
  try {
    const url = new URL(p, "http://x");
    const path = url.pathname + url.search;
    return path.startsWith("/") && !path.startsWith("//") && !path.startsWith("/auth") ? path : undefined;
  } catch {
    return undefined;
  }
}

export const Route = createFileRoute("/auth")({
  validateSearch: (search: Record<string, unknown>): { redirect?: string } => {
    const r = safePath(search["redirect"]);
    return r ? { redirect: r } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in — IronLog" },
      { name: "description", content: "Sign in to IronLog with Google to log your workouts and see your progress." },
      { property: "og:title", content: "Sign in — IronLog" },
      { property: "og:description", content: "Sign in to IronLog with Google to log your workouts and see your progress." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { redirect } = Route.useSearch();
  const { session, ready } = useAuth();
  const navigate = useNavigate();

  // Remember where to go after the Google round-trip.
  useEffect(() => {
    if (redirect) sessionStorage.setItem(POST_LOGIN_KEY, redirect);
  }, [redirect]);

  useEffect(() => {
    if (!ready || !session) return;
    const stored = safePath(sessionStorage.getItem(POST_LOGIN_KEY));
    sessionStorage.removeItem(POST_LOGIN_KEY);
    navigate({ to: stored ?? "/log", replace: true });
  }, [ready, session, navigate]);

  return (
    <div className="min-h-screen bg-hero">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-8">
        <Logo />
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="font-display text-5xl font-black uppercase leading-[0.95]">
            Every rep,
            <br />
            <span className="text-primary">on the record.</span>
          </h1>
          <p className="mt-4 text-muted-foreground">Sign in with your Google account to start logging.</p>
          <GoogleButton className="mt-8 w-full" />
          <ul className="mt-10 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-3"><Dumbbell className="h-4 w-4 text-primary" /> Log a set in three taps</li>
            <li className="flex items-center gap-3"><LineChart className="h-4 w-4 text-primary" /> Weight, volume and PR charts</li>
            <li className="flex items-center gap-3"><Share2 className="h-4 w-4 text-primary" /> Share a read-only link with friends</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

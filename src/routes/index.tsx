import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Dumbbell, Radar, Share2, Trophy } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { Logo } from "@/components/logo";
import { MUSCLES, MUSCLE_LABEL, WEIGHT_PRESETS, muscleColor } from "@/lib/workout";

// The home route ships no og:image, so hosting can inject the project's social preview.
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "IronLog — Log sets fast, watch your strength climb" },
      {
        name: "description",
        content: "A fast gym tracker: pick a muscle, tap a weight, save. See weight trends, weekly split radar and PRs, and share a read-only link.",
      },
      { property: "og:title", content: "IronLog — Log sets fast, watch your strength climb" },
      {
        property: "og:description",
        content: "Pick a muscle, tap a weight, save. Weight trends, weekly split radar, PR milestones and shareable progress.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { session, ready } = useAuth();

  return (
    <div className="min-h-screen bg-hero">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Logo />
        {ready && session ? (
          <Link to="/log" className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">
            Open my log
          </Link>
        ) : (
          <Link to="/login" className="rounded-full border border-border px-4 py-2 text-sm font-semibold hover:bg-secondary">
            Sign in
          </Link>
        )}
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-16">
        <section className="grid items-center gap-10 pt-10 md:grid-cols-[1.1fr_1fr] md:pt-20">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.25em] text-primary">Gym workout tracker</p>
            <h1 className="mt-3 font-display text-6xl font-black uppercase leading-[0.9] sm:text-7xl">
              Lift.
              <br />
              Log.
              <br />
              <span className="text-primary">Level up.</span>
            </h1>
            <p className="mt-5 max-w-md text-lg text-muted-foreground">
              Pick a muscle, tap a weight, save. IronLog turns every set into trends, a weekly balance radar and PR milestones.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              {ready && session ? (
                <Link to="/log" className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground shadow-glow">
                  Start logging <ArrowRight className="h-4 w-4" />
                </Link>
              ) : (
                <>
                  <Link to="/signup" className="inline-flex h-11 items-center gap-2 rounded-full bg-primary px-6 font-bold text-primary-foreground shadow-glow">
                    Create free account <ArrowRight className="h-4 w-4" />
                  </Link>
                  <Link to="/login" className="inline-flex h-11 items-center rounded-full border border-border px-6 font-semibold hover:bg-secondary">
                    Sign in
                  </Link>
                </>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 shadow-glow">
            <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Muscle</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {MUSCLES.map((m, i) => (
                <span
                  key={m}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold ${i === 2 ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                >
                  <span className="h-2 w-2 rounded-full" style={{ background: muscleColor(m) }} />
                  {MUSCLE_LABEL[m]}
                </span>
              ))}
            </div>
            <div className="mt-5 text-xs font-bold uppercase tracking-wider text-muted-foreground">Weight (lb)</div>
            <div className="mt-2 grid grid-cols-6 gap-1.5">
              {WEIGHT_PRESETS.map((w) => (
                <span
                  key={w}
                  className={`rounded-lg py-2 text-center font-display text-lg font-extrabold ${w === 45 ? "bg-primary text-primary-foreground" : "bg-secondary"}`}
                >
                  {w}
                </span>
              ))}
              <span className="rounded-lg border border-dashed border-border py-2 text-center text-sm font-semibold text-muted-foreground">+</span>
            </div>
            <div className="mt-5 flex items-center justify-between rounded-2xl bg-secondary p-4">
              <div>
                <div className="text-xs text-muted-foreground">Chest · 45 lb</div>
                <div className="font-display text-2xl font-black">3 sets saved</div>
              </div>
              <span className="rounded-full bg-gold px-3 py-1 text-xs font-bold text-background">NEW PR</span>
            </div>
          </div>
        </section>

        <section className="mt-20 grid gap-4 sm:grid-cols-3">
          {[
            { icon: Dumbbell, t: "Quick-save sets", d: "Weight buttons from 10–60 lb, or type any heavier amount." },
            { icon: Radar, t: "Balance radar", d: "See which muscles you're hitting this week vs last." },
            { icon: Trophy, t: "PR milestones", d: "Every time your top weight climbs, it's on the timeline." },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="rounded-2xl border border-border bg-card p-5">
              <Icon className="h-6 w-6 text-primary" />
              <h2 className="mt-3 font-display text-2xl font-extrabold uppercase">{t}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{d}</p>
            </div>
          ))}
        </section>

        <section className="mt-4 flex items-center gap-4 rounded-2xl border border-border bg-card p-5">
          <Share2 className="h-6 w-6 shrink-0 text-primary" />
          <p className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">Share without the keys.</span> Turn on a public link and anyone can view your charts and summary card — nobody else can edit.
          </p>
        </section>
      </main>
    </div>
  );
}

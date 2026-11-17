import { ClientOnly, createFileRoute, Link } from "@tanstack/react-router";
import { Lock } from "lucide-react";
import { Logo } from "@/components/logo";
import { ProgressDashboard } from "@/components/progress-dashboard";
import { SummaryCard } from "@/components/summary-card";
import { Skeleton } from "@/components/ui/skeleton";
import { getSharedWorkout } from "@/lib/share.functions";

export const Route = createFileRoute("/s/$token")({
  loader: ({ params }) => getSharedWorkout({ data: { token: params.token } }),
  head: ({ loaderData }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Shared log unavailable — IronLog" },
          { name: "description", content: "This shared workout log is private or no longer exists." },
          { property: "og:title", content: "Shared log unavailable — IronLog" },
          { property: "og:description", content: "This shared workout log is private or no longer exists." },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const name = loaderData.profile.first_name?.trim() || "A lifter";
    const title = `${name}'s training — IronLog`;
    const desc = `${loaderData.sets.length} sets logged. See ${name}'s weight trends, weekly split and personal bests.`;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:type", content: "profile" },
        { name: "twitter:card", content: "summary" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
  component: SharedPage,
});

function SharedPage() {
  const data = Route.useLoaderData();

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <Lock className="h-10 w-10 text-muted-foreground" />
        <h1 className="font-display text-4xl font-black uppercase">This log is private</h1>
        <p className="max-w-sm text-muted-foreground">The owner turned sharing off, or the link has changed.</p>
        <Link to="/" className="rounded-full bg-primary px-5 py-2.5 font-bold text-primary-foreground">
          Start your own log
        </Link>
      </div>
    );
  }

  const name = data.profile.first_name?.trim() || "A lifter";

  return (
    <div className="min-h-screen bg-hero pb-16">
      <header className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
        <Logo />
        <span className="rounded-full border border-border px-3 py-1 text-xs font-semibold text-muted-foreground">View only</span>
      </header>
      <main className="mx-auto max-w-5xl px-4">
        <div className="mb-6 mt-4 flex items-center gap-4">
          <span className="grid h-14 w-14 place-items-center rounded-full border border-border bg-secondary font-display text-xl font-black">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <div>
            <h1 className="font-display text-4xl font-black uppercase leading-none">{name}</h1>
            <p className="text-sm text-muted-foreground">Training progress</p>
          </div>
        </div>
        {/* Dates are grouped in the viewer's local time, so render after hydration. */}
        <ClientOnly fallback={<Skeleton className="h-96 w-full rounded-3xl" />}>
          <div className="space-y-6">
            <div className="max-w-xl">
              <SummaryCard name={name} sets={data.sets} />
            </div>
            <ProgressDashboard sets={data.sets} />
          </div>
        </ClientOnly>
        <div className="mt-10 text-center">
          <Link to="/" className="text-sm font-semibold text-primary hover:underline">
            Track your own workouts with IronLog →
          </Link>
        </div>
      </main>
    </div>
  );
}

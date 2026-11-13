import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { ProgressDashboard } from "@/components/progress-dashboard";
import { profileQueryOptions, setsQueryOptions } from "@/lib/workout-queries";

export const Route = createFileRoute("/_authenticated/progress")({
  head: () => ({
    meta: [
      { title: "Progress — IronLog" },
      { name: "description", content: "Weight and volume trends per muscle, weekly split radar and personal bests." },
      { property: "og:title", content: "Progress — IronLog" },
      { property: "og:description", content: "Weight and volume trends per muscle, weekly split radar and personal bests." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(setsQueryOptions),
      context.queryClient.ensureQueryData(profileQueryOptions),
    ]),
  component: ProgressPage,
});

function ProgressPage() {
  const { data: sets } = useSuspenseQuery(setsQueryOptions);
  return (
    <AppShell>
      <h1 className="mb-4 font-display text-4xl font-black uppercase">Progress</h1>
      <ProgressDashboard sets={sets} />
    </AppShell>
  );
}

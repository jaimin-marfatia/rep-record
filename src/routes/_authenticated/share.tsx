import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Copy, ExternalLink, Eye, Lock, RefreshCw, Share2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { SummaryCard } from "@/components/summary-card";
import { Switch } from "@/components/ui/switch";
import { profileQueryOptions, setsQueryOptions, useUpdateProfile } from "@/lib/workout-queries";

export const Route = createFileRoute("/_authenticated/share")({
  head: () => ({
    meta: [
      { title: "Share progress — IronLog" },
      { name: "description", content: "Turn on a read-only public link to your workout charts and summary card." },
      { property: "og:title", content: "Share progress — IronLog" },
      { property: "og:description", content: "Turn on a read-only public link to your workout charts and summary card." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(setsQueryOptions),
      context.queryClient.ensureQueryData(profileQueryOptions),
    ]),
  component: SharePage,
});

const newToken = () => crypto.randomUUID().replace(/-/g, "").slice(0, 16);

function SharePage() {
  const { data: sets } = useSuspenseQuery(setsQueryOptions);
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const update = useUpdateProfile();
  const [origin, setOrigin] = useState("");
  useEffect(() => setOrigin(window.location.origin), []);

  const url = `${origin}/s/${profile.share_token}`;
  const displayName = profile.first_name?.trim() || "My training";

  async function patch(p: Parameters<typeof update.mutateAsync>[0], msg: string) {
    try {
      await update.mutateAsync(p);
      toast.success(msg);
    } catch {
      toast.error("Couldn't update sharing. Please try again.");
    }
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Couldn't copy — select the link and copy it manually.");
    }
  }

  async function nativeShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: `${displayName} on IronLog`, url });
      } catch {
        /* user cancelled */
      }
    } else {
      void copy();
    }
  }

  return (
    <AppShell>
      <h1 className="font-display text-4xl font-black uppercase">Share</h1>
      <p className="mt-1 text-muted-foreground">Anyone with the link can view your charts and summary. Only you can log or edit.</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="min-w-0 space-y-4">
          <section className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-secondary">
                  {profile.share_enabled ? <Eye className="h-5 w-5 text-primary" /> : <Lock className="h-5 w-5 text-muted-foreground" />}
                </span>
                <div>
                  <div className="font-semibold">Public link</div>
                  <div className="text-sm text-muted-foreground">{profile.share_enabled ? "On — view only" : "Off — only you can see your log"}</div>
                </div>
              </div>
              <Switch
                checked={profile.share_enabled}
                disabled={update.isPending}
                aria-label="Turn public link on or off"
                onCheckedChange={(v) => void patch({ share_enabled: v }, v ? "Sharing is on" : "Sharing is off")}
              />
            </div>

            {profile.share_enabled ? (
              <div className="mt-5 space-y-3">
                <div className="flex items-center gap-2 rounded-xl border border-border bg-background p-2 pl-3">
                  <span className="min-w-0 flex-1 truncate font-mono text-sm">{url}</span>
                  <button type="button" onClick={() => void copy()} className="flex items-center gap-1 rounded-lg bg-primary px-3 py-2 text-sm font-bold text-primary-foreground">
                    <Copy className="h-4 w-4" /> Copy
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => void nativeShare()} className="flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-accent">
                    <Share2 className="h-4 w-4" /> Share…
                  </button>
                  <Link
                    to="/s/$token"
                    params={{ token: profile.share_token }}
                    target="_blank"
                    className="flex items-center gap-1.5 rounded-full bg-secondary px-4 py-2 text-sm font-semibold hover:bg-accent"
                  >
                    <ExternalLink className="h-4 w-4" /> Open public view
                  </Link>
                  <button
                    type="button"
                    disabled={update.isPending}
                    onClick={() => void patch({ share_token: newToken() }, "New link created — the old one no longer works")}
                    className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground hover:bg-secondary hover:text-foreground"
                  >
                    <RefreshCw className="h-4 w-4" /> New link
                  </button>
                </div>
              </div>
            ) : null}
          </section>

        </div>

        <div className="min-w-0">
          <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">Summary card preview</div>
          <SummaryCard name={displayName} sets={sets} />
        </div>
      </div>
    </AppShell>
  );
}

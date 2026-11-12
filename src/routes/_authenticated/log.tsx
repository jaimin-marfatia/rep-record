import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Check, Loader2, Minus, Plus, RotateCcw, Trash2, Trophy } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  MAX_REPS,
  MUSCLES,
  MUSCLE_LABEL,
  WEIGHT_PRESETS,
  dayKey,
  formatLbs,
  isNewPR,
  muscleColor,
  parseWeight,
  setVolume,
  type Muscle,
} from "@/lib/workout";
import { setsQueryOptions, useAddSet, useDeleteSet, type StoredSet } from "@/lib/workout-queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/log")({
  head: () => ({
    meta: [
      { title: "Log workout — IronLog" },
      { name: "description", content: "Log a set: choose a muscle, total weight and reps, then save." },
      { property: "og:title", content: "Log workout — IronLog" },
      { property: "og:description", content: "Log a set: choose a muscle, total weight and reps, then save." },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(setsQueryOptions),
  component: LogPage,
});

const QUICK_REPS = [5, 8, 10, 12, 15];

function LogPage() {
  const { data: sets } = useSuspenseQuery(setsQueryOptions);
  const addSet = useAddSet();
  const deleteSet = useDeleteSet();

  const last = sets[sets.length - 1];
  const [muscle, setMuscle] = useState<Muscle>(last?.muscle ?? "chest");
  const [weight, setWeight] = useState<number | null>(last?.weight ?? null);
  const [customText, setCustomText] = useState(
    last && !WEIGHT_PRESETS.includes(last.weight) ? String(last.weight) : "",
  );
  const [reps, setReps] = useState<number>(last?.reps ?? 10);

  const customWeight = customText ? parseWeight(customText) : null;
  const effectiveWeight = customText ? customWeight : weight;
  const repsValid = Number.isInteger(reps) && reps > 0 && reps <= MAX_REPS;
  const canSave = effectiveWeight !== null && repsValid && !addSet.isPending;

  const todayKey = dayKey(new Date());
  const today = useMemo(() => sets.filter((s) => dayKey(s.performed_at) === todayKey), [sets, todayKey]);
  const groups = useMemo(() => {
    const map = new Map<Muscle, StoredSet[]>();
    for (const s of today) map.set(s.muscle, [...(map.get(s.muscle) ?? []), s]);
    return [...map.entries()];
  }, [today]);

  async function save(input: { muscle: Muscle; weight: number; reps: number }) {
    const pr = isNewPR(input, sets);
    try {
      await addSet.mutateAsync(input);
      if (pr) toast.success(`New PR! ${MUSCLE_LABEL[input.muscle]} ${formatLbs(input.weight)} lb`, { icon: <Trophy className="h-4 w-4" /> });
      else toast.success(`Saved ${MUSCLE_LABEL[input.muscle]} · ${formatLbs(input.weight)} lb × ${input.reps}`);
    } catch {
      toast.error("Couldn't save that set. Check your connection and try again.");
    }
  }

  function onSave() {
    if (effectiveWeight === null || !repsValid) return;
    void save({ muscle, weight: effectiveWeight, reps });
  }

  async function onDelete(id: string) {
    try {
      await deleteSet.mutateAsync(id);
      toast("Set removed");
    } catch {
      toast.error("Couldn't remove that set.");
    }
  }

  const todayVolume = today.reduce((a, s) => a + setVolume(s), 0);
  const todayReps = today.reduce((a, s) => a + s.reps, 0);

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        {/* Logger */}
        <section className="min-w-0 rounded-3xl border border-border bg-card p-4 sm:p-6">
          <h1 className="font-display text-3xl font-black uppercase">Log a set</h1>

          <Label>Muscle</Label>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-7 lg:grid-cols-4 xl:grid-cols-7">
            {MUSCLES.map((m) => {
              const active = m === muscle;
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMuscle(m)}
                  aria-pressed={active}
                  className={cn(
                    "relative flex flex-col items-center gap-1.5 rounded-2xl border px-1 py-3 text-sm font-bold transition-all",
                    active ? "border-transparent bg-foreground text-background" : "border-border bg-surface hover:border-foreground/30",
                  )}
                >
                  <span className="h-3 w-3 rounded-full" style={{ background: muscleColor(m) }} />
                  {MUSCLE_LABEL[m]}
                </button>
              );
            })}
          </div>

          <Label>Total weight (lb)</Label>
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {WEIGHT_PRESETS.map((w) => {
              const active = !customText && weight === w;
              return (
                <button
                  key={w}
                  type="button"
                  onClick={() => {
                    setWeight(w);
                    setCustomText("");
                  }}
                  aria-pressed={active}
                  className={cn(
                    "rounded-xl py-3 font-display text-2xl font-extrabold tabular-nums transition-colors",
                    active ? "bg-primary text-primary-foreground shadow-glow" : "bg-secondary hover:bg-accent",
                  )}
                >
                  {w}
                </button>
              );
            })}
            <div className="relative col-span-4 sm:col-span-1">
              <input
                type="text"
                inputMode="decimal"
                placeholder="Custom"
                aria-label="Custom weight in pounds"
                value={customText}
                onChange={(e) => setCustomText(e.target.value.replace(/[^\d.]/g, ""))}
                className={cn(
                  "h-full min-h-12 w-full rounded-xl border bg-background px-3 text-center font-display text-2xl font-extrabold tabular-nums outline-none placeholder:font-sans placeholder:text-sm placeholder:font-semibold placeholder:text-muted-foreground focus:border-primary",
                  customText && customWeight !== null ? "border-primary" : "border-dashed border-border",
                  customText && customWeight === null && "border-destructive",
                )}
              />
            </div>
          </div>
          {customText && customWeight === null ? (
            <p className="mt-2 text-sm text-destructive">Enter a weight greater than 0.</p>
          ) : null}

          <Label>Reps</Label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              aria-label="Fewer reps"
              onClick={() => setReps((r) => Math.max(1, (Number.isFinite(r) ? r : 1) - 1))}
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-secondary hover:bg-accent"
            >
              <Minus className="h-5 w-5" />
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_REPS}
              aria-label="Reps"
              value={Number.isFinite(reps) ? reps : ""}
              onChange={(e) => setReps(e.target.value === "" ? Number.NaN : Math.floor(Number(e.target.value)))}
              className="h-14 w-full min-w-0 rounded-2xl border border-border bg-background text-center font-display text-4xl font-black tabular-nums outline-none focus:border-primary"
            />
            <button
              type="button"
              aria-label="More reps"
              onClick={() => setReps((r) => Math.min(MAX_REPS, (Number.isFinite(r) ? r : 0) + 1))}
              className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-secondary hover:bg-accent"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            {QUICK_REPS.map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setReps(r)}
                className={cn(
                  "flex-1 rounded-lg py-1.5 text-sm font-bold",
                  reps === r ? "bg-foreground text-background" : "bg-secondary text-muted-foreground hover:text-foreground",
                )}
              >
                {r}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="mt-6 flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-primary font-display text-2xl font-black uppercase tracking-wide text-primary-foreground shadow-glow transition-transform active:scale-[0.98] disabled:opacity-40 disabled:shadow-none"
          >
            {addSet.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Check className="h-6 w-6" />}
            Save set
            {effectiveWeight !== null && repsValid ? (
              <span className="ml-1 font-sans text-sm font-semibold normal-case opacity-80">
                {formatLbs(effectiveWeight)} × {reps}
              </span>
            ) : null}
          </button>
        </section>

        {/* Today's session */}
        <section className="min-w-0">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="font-display text-3xl font-black uppercase">Today's session</h2>
              <p className="text-sm text-muted-foreground">{format(new Date(), "EEEE, MMMM d")}</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <Mini label="Sets" value={String(today.length)} />
            <Mini label="Reps" value={String(todayReps)} />
            <Mini label="Volume" value={`${formatLbs(todayVolume)}`} accent />
          </div>

          {groups.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              No sets yet today. Your first one will show up here.
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {groups.map(([m, list]) => {
                const lastOfGroup = list[list.length - 1]!;
                const vol = list.reduce((a, s) => a + setVolume(s), 0);
                return (
                  <div key={m} className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: muscleColor(m) }} />
                        <span className="font-display text-xl font-extrabold uppercase">{MUSCLE_LABEL[m]}</span>
                        <span className="text-xs text-muted-foreground">
                          {list.length} {list.length === 1 ? "set" : "sets"} · {formatLbs(vol)} lb
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={addSet.isPending}
                        onClick={() => void save({ muscle: m, weight: lastOfGroup.weight, reps: lastOfGroup.reps })}
                        className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold hover:bg-accent disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Same again
                      </button>
                    </div>
                    <ul>
                      {list.map((s, i) => (
                        <li key={s.id} className="flex items-center gap-3 px-4 py-2.5 text-sm even:bg-surface/50">
                          <span className="w-6 text-xs font-bold text-muted-foreground">#{i + 1}</span>
                          <span className="font-display text-xl font-extrabold tabular-nums">{formatLbs(s.weight)}</span>
                          <span className="text-muted-foreground">lb × {s.reps}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{format(parseISO(s.performed_at), "h:mm a")}</span>
                          <button
                            type="button"
                            aria-label="Remove set"
                            onClick={() => void onDelete(s.id)}
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Label({ children }: { children: string }) {
  return <div className="mb-2 mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">{children}</div>;
}

function Mini({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-border bg-card p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("font-display text-2xl font-black tabular-nums", accent && "text-primary")}>{value}</div>
    </div>
  );
}

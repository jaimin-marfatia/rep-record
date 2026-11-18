import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Check, Loader2, Minus, Plus, RotateCcw, Trash2, Trophy } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import {
  DEFAULT_SET_COUNT,
  MAX_SET_COUNT,
  MIN_SET_COUNT,
  MUSCLES,
  MUSCLE_LABEL,
  WEIGHT_PRESETS,
  clampSetCount,
  countSets,
  dayKey,
  formatLbs,
  isNewPR,
  muscleColor,
  parseWeight,
  performedAtFor,
  setsLabel,
  type Muscle,
} from "@/lib/workout";
import { profileQueryOptions, setsQueryOptions, useAddSet, useDeleteSet, type StoredSet } from "@/lib/workout-queries";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/log")({
  head: () => ({
    meta: [
      { title: "Log workout — IronLog" },
      { name: "description", content: "Log a workout: choose a muscle, total weight, number of sets and date, then save." },
      { property: "og:title", content: "Log workout — IronLog" },
      { property: "og:description", content: "Log a workout: choose a muscle, total weight, number of sets and date, then save." },
    ],
  }),
  loader: ({ context }) =>
    Promise.all([
      context.queryClient.ensureQueryData(setsQueryOptions),
      context.queryClient.ensureQueryData(profileQueryOptions),
    ]),
  component: LogPage,
});

const QUICK_SET_COUNTS = [1, 2, 3, 4, 5];

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
  const [setCount, setSetCount] = useState(last?.setCount ?? DEFAULT_SET_COUNT);
  const todayKey = dayKey(new Date());
  const [dateKey, setDateKey] = useState(todayKey);
  const isToday = dateKey === todayKey;

  const customWeight = customText ? parseWeight(customText) : null;
  const effectiveWeight = customText ? customWeight : weight;
  const canSave = effectiveWeight !== null && !addSet.isPending;

  const day = useMemo(() => sets.filter((s) => dayKey(s.performed_at) === dateKey), [sets, dateKey]);
  const groups = useMemo(() => {
    const map = new Map<Muscle, StoredSet[]>();
    for (const s of day) map.set(s.muscle, [...(map.get(s.muscle) ?? []), s]);
    return [...map.entries()];
  }, [day]);

  async function save(input: { muscle: Muscle; weight: number; setCount: number }, performedAt = performedAtFor(dateKey)) {
    const pr = isNewPR(input, sets);
    const what = `${MUSCLE_LABEL[input.muscle]} · ${formatLbs(input.weight)} lb × ${setsLabel(input.setCount)}`;
    try {
      await addSet.mutateAsync({ ...input, performed_at: performedAt });
      if (pr) toast.success(`New PR! ${what}`, { icon: <Trophy className="h-4 w-4" /> });
      else toast.success(`Saved ${what}${isToday ? "" : ` · ${format(parseISO(dateKey), "MMM d")}`}`);
    } catch {
      toast.error("Couldn't save that log. Check your connection and try again.");
    }
  }

  function onSave() {
    if (effectiveWeight === null) return;
    void save({ muscle, weight: effectiveWeight, setCount });
  }

  async function onDelete(s: StoredSet) {
    try {
      await deleteSet.mutateAsync(s.id);
      toast(`Deleted ${MUSCLE_LABEL[s.muscle]} · ${formatLbs(s.weight)} lb × ${setsLabel(s.setCount)}`, {
        action: {
          label: "Undo",
          onClick: () => void addSet.mutateAsync({ muscle: s.muscle, weight: s.weight, setCount: s.setCount, performed_at: s.performed_at }).catch(() => toast.error("Couldn't restore that log.")),
        },
      });
    } catch {
      toast.error("Couldn't delete that log.");
    }
  }

  const daySets = countSets(day);
  const topWeight = day.reduce((a, s) => Math.max(a, s.weight), 0);

  return (
    <AppShell>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        {/* Logger */}
        <section className="min-w-0 rounded-3xl border border-border bg-card p-4 sm:p-6">
          <h1 className="font-display text-3xl font-black uppercase">Log a workout</h1>

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

          <Label>Number of sets</Label>
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center rounded-2xl border border-border bg-background">
              <button
                type="button"
                aria-label="One less set"
                disabled={setCount <= MIN_SET_COUNT}
                onClick={() => setSetCount((n) => clampSetCount(n - 1))}
                className="grid h-12 w-12 place-items-center rounded-l-2xl hover:bg-secondary disabled:opacity-30"
              >
                <Minus className="h-5 w-5" />
              </button>
              <output aria-label="Sets" className="w-12 text-center font-display text-3xl font-black tabular-nums">
                {setCount}
              </output>
              <button
                type="button"
                aria-label="One more set"
                disabled={setCount >= MAX_SET_COUNT}
                onClick={() => setSetCount((n) => clampSetCount(n + 1))}
                className="grid h-12 w-12 place-items-center rounded-r-2xl hover:bg-secondary disabled:opacity-30"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>
            <div className="flex gap-1.5">
              {QUICK_SET_COUNTS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSetCount(n)}
                  aria-pressed={setCount === n}
                  aria-label={setsLabel(n)}
                  className={cn(
                    "h-12 w-10 rounded-xl font-display text-xl font-extrabold tabular-nums transition-colors",
                    setCount === n ? "bg-foreground text-background" : "bg-secondary hover:bg-accent",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <Label>Date</Label>
          <div className="flex items-center gap-2">
            <input
              type="date"
              aria-label="Workout date"
              max={todayKey}
              value={dateKey}
              onChange={(e) => setDateKey(e.target.value && e.target.value <= todayKey ? e.target.value : todayKey)}
              className="h-12 w-full min-w-0 rounded-xl border border-border bg-background px-3 font-semibold outline-none focus:border-primary [color-scheme:dark]"
            />
            {!isToday ? (
              <button type="button" onClick={() => setDateKey(todayKey)} className="h-12 shrink-0 rounded-xl bg-secondary px-4 text-sm font-bold hover:bg-accent">
                Today
              </button>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onSave}
            disabled={!canSave}
            className="mt-6 flex h-16 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary font-display text-2xl font-black uppercase tracking-wide text-primary-foreground shadow-glow transition-transform active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            {addSet.isPending ? <Loader2 className="h-6 w-6 animate-spin" /> : <Check className="h-6 w-6" />}
            Save
            {effectiveWeight !== null ? (
              <span className="ml-1 font-sans text-sm font-semibold normal-case opacity-80">
                {formatLbs(effectiveWeight)} lb × {setsLabel(setCount)}
              </span>
            ) : null}
          </button>
        </section>

        {/* Session for the chosen day */}
        <section className="min-w-0">
          <div>
            <h2 className="font-display text-3xl font-black uppercase">{isToday ? "Today's session" : "Session"}</h2>
            <p className="text-sm text-muted-foreground">{format(parseISO(dateKey), "EEEE, MMMM d")}</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2">
            <Mini label="Sets" value={String(daySets)} accent />
            <Mini label="Top weight" value={topWeight ? `${formatLbs(topWeight)} lb` : "—"} />
          </div>

          {groups.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
              {isToday ? "Nothing logged yet today. Your first save will show up here." : "Nothing logged for this day yet."}
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {groups.map(([m, list]) => {
                const lastOfGroup = list[list.length - 1]!;
                return (
                  <div key={m} className="overflow-hidden rounded-2xl border border-border bg-card">
                    <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full" style={{ background: muscleColor(m) }} />
                        <span className="font-display text-xl font-extrabold uppercase">{MUSCLE_LABEL[m]}</span>
                        <span className="text-xs text-muted-foreground">{setsLabel(countSets(list))}</span>
                      </div>
                      <button
                        type="button"
                        disabled={addSet.isPending}
                        onClick={() => void save({ muscle: m, weight: lastOfGroup.weight, setCount: lastOfGroup.setCount })}
                        className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-xs font-bold hover:bg-accent disabled:opacity-50"
                      >
                        <RotateCcw className="h-3.5 w-3.5" /> Same again
                      </button>
                    </div>
                    <ul>
                      {list.map((s) => (
                        <li key={s.id} className="flex items-center gap-2 px-4 py-2.5 text-sm even:bg-surface/50">
                          <span className="font-display text-xl font-extrabold tabular-nums">{formatLbs(s.weight)}</span>
                          <span className="text-muted-foreground">lb</span>
                          <span className="font-semibold">× {setsLabel(s.setCount)}</span>
                          <span className="ml-auto text-xs text-muted-foreground">{isToday ? format(parseISO(s.performed_at), "h:mm a") : null}</span>
                          <button
                            type="button"
                            aria-label={`Delete ${MUSCLE_LABEL[s.muscle]} ${formatLbs(s.weight)} lb log`}
                            disabled={deleteSet.isPending}
                            onClick={() => void onDelete(s)}
                            className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1.5 text-xs font-bold text-muted-foreground hover:border-destructive hover:text-destructive disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Delete
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

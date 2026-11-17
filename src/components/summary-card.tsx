import { forwardRef, useMemo } from "react";
import { Trophy } from "lucide-react";
import {
  MUSCLES,
  MUSCLE_LABEL,
  formatLbs,
  muscleColor,
  personalBests,
  summarize,
  weeklySplit,
  type WorkoutSet,
} from "@/lib/workout";

export const SummaryCard = forwardRef<HTMLDivElement, { name: string; sets: WorkoutSet[] }>(function SummaryCard(
  { name, sets },
  ref,
) {
  const summary = useMemo(() => summarize(sets), [sets]);
  const split = useMemo(() => weeklySplit(sets), [sets]);
  const bests = useMemo(() => personalBests(sets), [sets]);
  const top = useMemo(() => {
    let best: { muscle: (typeof MUSCLES)[number]; weight: number } | null = null;
    for (const m of MUSCLES) {
      const b = bests[m];
      if (b && (!best || b.weight > best.weight)) best = { muscle: m, weight: b.weight };
    }
    return best;
  }, [bests]);
  const maxWeek = Math.max(1, ...split.map((s) => s.thisWeek));

  return (
    <div ref={ref} className="relative overflow-hidden rounded-3xl border border-border bg-card bg-hero p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-primary">IronLog</div>
          <div className="mt-1 font-display text-3xl font-black uppercase leading-none sm:text-4xl">{name}</div>
        </div>
        {top ? (
          <div className="rounded-2xl bg-secondary px-3 py-2 text-right">
            <div className="flex items-center justify-end gap-1 text-[11px] font-bold uppercase tracking-wider text-gold">
              <Trophy className="h-3 w-3" /> Top PR
            </div>
            <div className="font-display text-2xl font-black leading-tight">{formatLbs(top.weight)} lb</div>
            <div className="text-xs text-muted-foreground">{MUSCLE_LABEL[top.muscle]}</div>
          </div>
        ) : null}
      </div>

      <div className="mt-5 grid grid-cols-3 gap-2">
        {[
          { l: "Sets", v: summary.totalSets.toLocaleString("en-US") },
          { l: "Days", v: `${summary.workoutDays}` },
          { l: "Streak", v: `${summary.currentStreak}` },
        ].map((x) => (
          <div key={x.l} className="rounded-xl bg-background/50 p-3">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{x.l}</div>
            <div className="font-display text-2xl font-black tabular-nums">{x.v}</div>
          </div>
        ))}
      </div>

      <div className="mt-5">
        <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">This week's split</div>
        <div className="flex h-20 items-end gap-1.5">
          {split.map((s) => (
            <div key={s.muscle} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-14 w-full items-end">
                <div
                  className="w-full rounded-md"
                  style={{
                    height: `${Math.max(6, (s.thisWeek / maxWeek) * 100)}%`,
                    background: muscleColor(s.muscle),
                    opacity: s.thisWeek ? 1 : 0.2,
                  }}
                />
              </div>
              <div className="text-[10px] font-semibold text-muted-foreground">{s.label.slice(0, 3)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

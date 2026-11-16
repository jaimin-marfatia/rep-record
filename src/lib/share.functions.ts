import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { isShareToken } from "@/lib/share";
import { isMuscle, type WorkoutSet } from "@/lib/workout";

export interface SharedWorkout {
  profile: { first_name: string | null };
  sets: WorkoutSet[];
}

/** Public, read-only: returns data only if the owner turned sharing on for this link. */
export const getSharedWorkout = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => ({ token: String(input?.token ?? "") }))
  .handler(async ({ data }): Promise<SharedWorkout | null> => {
    if (!isShareToken(data.token)) return null;
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
    const client = createClient<Database>(process.env["SUPABASE_URL"]!, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: {
        fetch: (input, init) => {
          const h = new Headers(init?.headers);
          if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
          h.set("apikey", key);
          return fetch(input, { ...init, headers: h });
        },
      },
    });

    const { data: prof, error } = await client.rpc("get_shared_profile", { _token: data.token });
    if (error) throw new Error("Could not load this shared log");
    const profile = prof?.[0];
    if (!profile) return null;

    const sets: WorkoutSet[] = [];
    const PAGE = 1000;
    for (let from = 0; ; from += PAGE) {
      const { data: rows, error: setErr } = await client
        .rpc("get_shared_sets", { _token: data.token })
        .range(from, from + PAGE - 1);
      if (setErr) throw new Error("Could not load this shared log");
      for (const r of rows ?? []) {
        if (isMuscle(r.muscle)) {
          sets.push({ muscle: r.muscle, weight: Number(r.weight), reps: r.reps, performed_at: r.performed_at });
        }
      }
      if (!rows || rows.length < PAGE) break;
    }
    return { profile: { first_name: profile.first_name }, sets };
  });

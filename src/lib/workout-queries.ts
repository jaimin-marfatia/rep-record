import { queryOptions, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { clampSetCount, isMuscle, type Muscle, type WorkoutSet } from "@/lib/workout";

export interface StoredSet extends WorkoutSet {
  id: string;
}

export interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  share_token: string;
  share_enabled: boolean;
}

const PROFILE_COLS = "id, first_name, last_name, username, share_token, share_enabled";

const PAGE = 1000;
const SET_COLS = "id, muscle, weight, set_count, performed_at";

function toSet(r: { id: string; muscle: string; weight: number; set_count: number; performed_at: string }): StoredSet | null {
  if (!isMuscle(r.muscle)) return null;
  return { id: r.id, muscle: r.muscle, weight: Number(r.weight), setCount: r.set_count, performed_at: r.performed_at };
}

async function fetchAllSets(): Promise<StoredSet[]> {
  const out: StoredSet[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await supabase
      .from("workout_sets")
      .select(SET_COLS)
      .order("performed_at", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw error;
    for (const r of data ?? []) {
      const s = toSet(r);
      if (s) out.push(s);
    }
    if (!data || data.length < PAGE) break;
  }
  return out;
}

export const setsQueryOptions = queryOptions({
  queryKey: ["workout-sets"],
  queryFn: fetchAllSets,
});

async function fetchProfile(): Promise<Profile> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Not signed in");
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLS)
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  if (data) return data;
  // Safety net if the profile row was never created.
  const meta = user.user_metadata as Record<string, unknown>;
  const str = (k: string) => (typeof meta[k] === "string" ? (meta[k] as string) : null);
  const { data: created, error: insErr } = await supabase
    .from("profiles")
    .insert({ id: user.id, first_name: str("first_name"), last_name: str("last_name"), username: str("username"), display_name: str("first_name") })
    .select(PROFILE_COLS)
    .single();
  if (insErr) throw insErr;
  return created;
}

export const profileQueryOptions = queryOptions({
  queryKey: ["profile"],
  queryFn: fetchProfile,
});

export function useAddSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { muscle: Muscle; weight: number; setCount: number; performed_at?: string }) => {
      const { data, error } = await supabase
        .from("workout_sets")
        .insert({ muscle: input.muscle, weight: input.weight, set_count: clampSetCount(input.setCount), performed_at: input.performed_at })
        .select(SET_COLS)
        .single();
      if (error) throw error;
      const s = toSet(data);
      if (!s) throw new Error("Unexpected muscle");
      return s;
    },
    onSuccess: (s) => {
      qc.setQueryData<StoredSet[]>(setsQueryOptions.queryKey, (old) =>
        [...(old ?? []), s].sort((a, b) => a.performed_at.localeCompare(b.performed_at)),
      );
    },
  });
}

export function useDeleteSet() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("workout_sets").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      qc.setQueryData<StoredSet[]>(setsQueryOptions.queryKey, (old) => (old ?? []).filter((s) => s.id !== id));
    },
  });
}

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Pick<Profile, "share_enabled" | "share_token">>) => {
      const current = qc.getQueryData<Profile>(profileQueryOptions.queryKey);
      if (!current) throw new Error("Profile not loaded");
      const { data, error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", current.id)
        .select(PROFILE_COLS)
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (p) => qc.setQueryData(profileQueryOptions.queryKey, p),
  });
}

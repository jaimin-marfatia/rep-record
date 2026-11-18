/**
 * Live checks against the real database: privacy between accounts, username uniqueness and
 * read-only sharing. Runs only when the server credentials are present (skipped otherwise);
 * every account it creates is deleted afterwards.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { usernameToEmail } from "@/lib/account";

const URL = process.env["SUPABASE_URL"];
const SERVICE = process.env["SUPABASE_SERVICE_ROLE_KEY"];
const PUBLISHABLE = process.env["SUPABASE_PUBLISHABLE_KEY"];
const enabled = !!(URL && SERVICE && PUBLISHABLE);

function client(key: string): SupabaseClient<Database> {
  return createClient<Database>(URL!, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_publishable_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

const suffix = Math.random().toString(36).slice(2, 8);
const PW = "secret123";
const ids: string[] = [];

async function makeUser(username: string, first: string) {
  const admin = client(SERVICE!);
  const { data, error } = await admin.auth.admin.createUser({
    email: usernameToEmail(username),
    password: PW,
    email_confirm: true,
    user_metadata: { first_name: first, last_name: "Test", username },
  });
  if (error) throw error;
  ids.push(data.user.id);
  const c = client(PUBLISHABLE!);
  const { error: e2 } = await c.auth.signInWithPassword({ email: usernameToEmail(username), password: PW });
  if (e2) throw e2;
  return { id: data.user.id, c };
}

describe.skipIf(!enabled)("backend (live)", () => {
  let a: Awaited<ReturnType<typeof makeUser>>;
  let b: Awaited<ReturnType<typeof makeUser>>;

  beforeAll(async () => {
    a = await makeUser(`zzit_a_${suffix}`, "Alice");
    b = await makeUser(`zzit_b_${suffix}`, "Bob");
  }, 30000);

  afterAll(async () => {
    const admin = client(SERVICE!);
    for (const id of ids) await admin.auth.admin.deleteUser(id);
  }, 30000);

  it("creates a profile with first name, last name and username on sign-up", async () => {
    const { data } = await a.c.from("profiles").select("first_name,last_name,username,share_enabled").eq("id", a.id).single();
    expect(data).toEqual({ first_name: "Alice", last_name: "Test", username: `zzit_a_${suffix}`, share_enabled: false });
  });

  it("blocks a second account with the same username in any letter case", async () => {
    const { error } = await client(SERVICE!).from("profiles").update({ username: `ZZIT_A_${suffix}`.toLowerCase() }).eq("id", b.id);
    expect(error).not.toBeNull();
  });

  it("logs, reads and deletes your own sets", async () => {
    const { data: row, error } = await a.c.from("workout_sets").insert({ muscle: "chest", weight: 45, set_count: 3 }).select("id,muscle,weight,set_count").single();
    expect(error).toBeNull();
    expect(row).toMatchObject({ muscle: "chest", weight: 45, set_count: 3 });
    const { data: mine } = await a.c.from("workout_sets").select("id");
    expect(mine?.map((r) => r.id)).toContain(row!.id);
    await a.c.from("workout_sets").insert({ muscle: "legs", weight: 135, set_count: 5 });
    const { error: delErr } = await a.c.from("workout_sets").delete().eq("id", row!.id);
    expect(delErr).toBeNull();
    const { data: after } = await a.c.from("workout_sets").select("id");
    expect(after?.map((r) => r.id)).not.toContain(row!.id);
  });

  it("never shows one account's sets or profile to another", async () => {
    const { data: sets } = await b.c.from("workout_sets").select("id").eq("user_id", a.id);
    expect(sets).toEqual([]);
    const { data: prof } = await b.c.from("profiles").select("id").eq("id", a.id);
    expect(prof).toEqual([]);
  });

  it("does not let another account log sets on your behalf or edit your profile", async () => {
    const { error } = await b.c.from("workout_sets").insert({ muscle: "abs", weight: 10, set_count: 2, user_id: a.id });
    expect(error).not.toBeNull();
    await b.c.from("profiles").update({ share_enabled: true }).eq("id", a.id);
    const { data } = await a.c.from("profiles").select("share_enabled").eq("id", a.id).single();
    expect(data?.share_enabled).toBe(false);
  });

  it("gives signed-out visitors no direct access to the tables", async () => {
    const anon = client(PUBLISHABLE!);
    const { data: sets } = await anon.from("workout_sets").select("id");
    expect(sets ?? []).toEqual([]);
    const { data: profs } = await anon.from("profiles").select("id");
    expect(profs ?? []).toEqual([]);
  });

  it("returns nothing from a share link while sharing is off", async () => {
    const { data: me } = await a.c.from("profiles").select("share_token").eq("id", a.id).single();
    const anon = client(PUBLISHABLE!);
    const { data: prof } = await anon.rpc("get_shared_profile", { _token: me!.share_token });
    const { data: sets } = await anon.rpc("get_shared_sets", { _token: me!.share_token });
    expect(prof ?? []).toEqual([]);
    expect(sets ?? []).toEqual([]);
  });

  it("shows only the first name and sets once sharing is on, and a new link kills the old one", async () => {
    await a.c.from("profiles").update({ share_enabled: true }).eq("id", a.id);
    const { data: me } = await a.c.from("profiles").select("share_token").eq("id", a.id).single();
    const anon = client(PUBLISHABLE!);
    const { data: prof } = await anon.rpc("get_shared_profile", { _token: me!.share_token });
    expect(prof?.[0]?.first_name).toBe("Alice");
    expect(Object.keys(prof?.[0] ?? {})).not.toContain("last_name");
    const { data: sets } = await anon.rpc("get_shared_sets", { _token: me!.share_token });
    expect(sets?.map((s) => [s.muscle, Number(s.weight), s.set_count])).toEqual([["legs", 135, 5]]);

    await a.c.from("profiles").update({ share_token: `new${suffix}token1` }).eq("id", a.id);
    const { data: old } = await anon.rpc("get_shared_profile", { _token: me!.share_token });
    expect(old ?? []).toEqual([]);
  });
});

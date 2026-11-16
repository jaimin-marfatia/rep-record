import { describe, expect, it, vi } from "vitest";
import { CREATE_FAILED, USERNAME_TAKEN, runCreateAccount, type AccountAdmin } from "@/lib/create-account";

const valid = { firstName: " Jaimin ", lastName: " Marfatia ", username: " Jaimin_99 ", password: "secret1" };

function fakeAdmin(over: Partial<AccountAdmin> = {}): AccountAdmin & { created: Parameters<AccountAdmin["createUser"]>[0][] } {
  const created: Parameters<AccountAdmin["createUser"]>[0][] = [];
  return {
    created,
    findUsername: async () => ({ taken: false }),
    createUser: async (input) => {
      created.push(input);
      return {};
    },
    ...over,
  };
}

describe("create account", () => {
  it("stores first name, last name and lowercase username, signing in as the synthetic email", async () => {
    const admin = fakeAdmin();
    expect(await runCreateAccount(valid, admin)).toEqual({ ok: true });
    expect(admin.created).toEqual([
      {
        email: "jaimin_99@users.ironlog.local",
        password: "secret1",
        metadata: { first_name: "Jaimin", last_name: "Marfatia", username: "jaimin_99" },
      },
    ]);
  });

  it("rejects a password under 6 characters without creating anything", async () => {
    const admin = fakeAdmin();
    const res = await runCreateAccount({ ...valid, password: "12345" }, admin);
    expect(res).toMatchObject({ ok: false, field: "password" });
    expect(admin.created).toHaveLength(0);
  });

  it("rejects a username that is already taken", async () => {
    const admin = fakeAdmin({ findUsername: async () => ({ taken: true }) });
    expect(await runCreateAccount(valid, admin)).toEqual({ ok: false, field: "username", message: USERNAME_TAKEN });
    expect(admin.created).toHaveLength(0);
  });

  it("treats a simultaneous sign-up with the same username as taken", async () => {
    const admin = fakeAdmin({ createUser: async () => ({ error: "A user with this email address has already been registered" }) });
    expect(await runCreateAccount(valid, admin)).toMatchObject({ ok: false, field: "username", message: USERNAME_TAKEN });
  });

  it("returns the general failure message when the backend errors", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const lookupFails = fakeAdmin({ findUsername: async () => ({ taken: false, error: "timeout" }) });
    expect(await runCreateAccount(valid, lookupFails)).toEqual({ ok: false, message: CREATE_FAILED });
    const createFails = fakeAdmin({ createUser: async () => ({ error: "rate limit" }) });
    expect(await runCreateAccount(valid, createFails)).toEqual({ ok: false, message: CREATE_FAILED });
  });
});

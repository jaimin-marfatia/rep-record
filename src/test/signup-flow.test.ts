import { describe, expect, it, vi } from "vitest";
import { NETWORK_ERROR, signUpAndSignIn } from "@/lib/signup-flow";

const noWait = async () => {};
vi.spyOn(console, "error").mockImplementation(() => {});

describe("sign-up then sign-in", () => {
  it("signs the new user straight in", async () => {
    const out = await signUpAndSignIn({ create: async () => ({ ok: true }), signIn: async () => ({ ok: true }), wait: noWait });
    expect(out).toEqual({ kind: "signed-in" });
  });

  it("retries once when the request drops, and succeeds", async () => {
    const create = vi.fn().mockRejectedValueOnce(new Error("aborted")).mockResolvedValueOnce({ ok: true });
    const signIn = vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValueOnce({ ok: true });
    expect(await signUpAndSignIn({ create, signIn, wait: noWait })).toEqual({ kind: "signed-in" });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("signs in without retrying when the account was created before the request dropped", async () => {
    const create = vi.fn().mockRejectedValue(new Error("aborted"));
    const out = await signUpAndSignIn({ create, signIn: async () => ({ ok: true }), wait: noWait });
    expect(out).toEqual({ kind: "signed-in" });
    expect(create).toHaveBeenCalledTimes(1);
  });

  it("shows a connection message after two dropped requests", async () => {
    const create = vi.fn().mockRejectedValue(new Error("offline"));
    const out = await signUpAndSignIn({ create, signIn: async () => ({ ok: false }), wait: noWait });
    expect(out).toEqual({ kind: "form-error", message: NETWORK_ERROR });
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("shows a taken username next to the username field", async () => {
    const out = await signUpAndSignIn({
      create: async () => ({ ok: false, field: "username", message: "taken" }),
      signIn: async () => ({ ok: true }),
      wait: noWait,
    });
    expect(out).toEqual({ kind: "field-error", field: "username", message: "taken" });
  });

  it("sends the user to sign in manually if automatic sign-in fails after creation", async () => {
    const out = await signUpAndSignIn({ create: async () => ({ ok: true }), signIn: async () => ({ ok: false }), wait: noWait });
    expect(out).toEqual({ kind: "created-sign-in-manually" });
  });
});

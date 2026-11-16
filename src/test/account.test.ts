import { describe, expect, it } from "vitest";
import {
  loginErrorMessage,
  normalizeUsername,
  passwordError,
  safeRedirectPath,
  usernameError,
  usernameToEmail,
  validateSignup,
} from "@/lib/account";

describe("password", () => {
  it("rejects passwords shorter than 6 characters", () => {
    expect(passwordError("12345")).not.toBeNull();
  });
  it("accepts a 6-character password", () => {
    expect(passwordError("123456")).toBeNull();
  });
});

describe("username", () => {
  it("is case-insensitive so the same name can't be registered twice", () => {
    expect(normalizeUsername("  JaiMin_99 ")).toBe("jaimin_99");
    expect(usernameToEmail("Jaimin")).toBe(usernameToEmail("jaimin"));
  });
  it("maps to a synthetic auth email", () => {
    expect(usernameToEmail("jaimin")).toBe("jaimin@users.ironlog.local");
  });
  it("rejects spaces, symbols and @", () => {
    expect(usernameError("jai min")).not.toBeNull();
    expect(usernameError("jai@min")).not.toBeNull();
    expect(usernameError("jai.min")).not.toBeNull();
  });
  it("requires 3 to 20 characters", () => {
    expect(usernameError("ab")).not.toBeNull();
    expect(usernameError("abc")).toBeNull();
    expect(usernameError("a".repeat(20))).toBeNull();
    expect(usernameError("a".repeat(21))).not.toBeNull();
  });
});

describe("sign-up form", () => {
  it("requires first name, last name, username and password", () => {
    const errors = validateSignup({ firstName: " ", lastName: "", username: "", password: "" });
    expect(Object.keys(errors).sort()).toEqual(["firstName", "lastName", "password", "username"]);
  });
  it("passes with valid details", () => {
    expect(validateSignup({ firstName: "Jaimin", lastName: "Marfatia", username: "jaimin", password: "secret" })).toEqual({});
  });
});

describe("post-login redirect", () => {
  it("keeps same-origin app paths", () => {
    expect(safeRedirectPath("/progress?range=4w")).toBe("/progress?range=4w");
  });
  it("drops external URLs and auth pages", () => {
    expect(safeRedirectPath("https://evil.example/x")).toBeUndefined();
    expect(safeRedirectPath("//evil.example")).toBeUndefined();
    expect(safeRedirectPath("/login")).toBeUndefined();
    expect(safeRedirectPath("/signup?x=1")).toBeUndefined();
  });
});

describe("sign-in errors", () => {
  it("says wrong username or password for bad credentials", () => {
    expect(loginErrorMessage("Invalid login credentials")).toBe("Wrong username or password");
  });
  it("gives a general retry message for other failures", () => {
    expect(loginErrorMessage("fetch failed")).toBe("Couldn't sign in. Please try again.");
  });
});

import { QueryClient } from "@tanstack/react-query";
import { createRouter, rootRouteId } from "@tanstack/react-router";
import { describe, expect, it } from "vitest";

import { routeTree } from "@/routeTree.gen";

// Match routes without running loaders or rendering: loaders may need a server or
// network the test run lacks, and jsdom never loads the stylesheets React waits on.
const router = createRouter({ routeTree, context: { queryClient: new QueryClient() } });
const leaf = (path: string) => router.matchRoutes(path).at(-1)?.routeId;

describe("App routing", () => {
  it("matches a page for / instead of falling back to not found", () => {
    expect(leaf("/")).not.toBe(rootRouteId);
  });

  it.each([
    ["/signup", "/signup"],
    ["/login", "/login"],
    ["/auth", "/auth"],
    ["/s/abcd1234", "/s/$token"],
  ])("public page %s is reachable without signing in", (path, id) => {
    expect(leaf(path)).toBe(id);
    expect(router.matchRoutes(path).some((m) => m.routeId === "/_authenticated")).toBe(false);
  });

  it.each(["/log", "/progress", "/share"])("%s is behind the sign-in gate", (path) => {
    expect(leaf(path)).toBe(`/_authenticated${path}`);
    expect(router.matchRoutes(path).some((m) => m.routeId === "/_authenticated")).toBe(true);
  });
});

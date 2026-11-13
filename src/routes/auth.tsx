import { createFileRoute, redirect } from "@tanstack/react-router";
import { safeRedirectPath } from "@/lib/account";

// Old sign-in address: kept so existing links and the sign-in gate land on /login.
export const Route = createFileRoute("/auth")({
  beforeLoad: ({ search }) => {
    const r = safeRedirectPath((search as Record<string, unknown>)["redirect"]);
    throw redirect({ to: "/login", search: r ? { redirect: r } : {}, replace: true });
  },
});

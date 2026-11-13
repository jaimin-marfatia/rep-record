import type { ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { BarChart3, Dumbbell, LogOut, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/logo";
import { profileQueryOptions } from "@/lib/workout-queries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/log", label: "Log", icon: Dumbbell },
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/share", label: "Share", icon: Share2 },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { data: profile } = useSuspenseQuery(profileQueryOptions);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const firstName = profile.first_name?.trim() || "Lifter";
  const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || firstName;

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/login", replace: true });
  }

  return (
    <div className="min-h-screen pb-24 md:pb-10">
      <header className="sticky top-0 z-30 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "bg-secondary text-foreground" }}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full outline-none ring-ring focus-visible:ring-2">
              <span className="grid h-9 w-9 place-items-center rounded-full border border-border bg-secondary text-sm font-bold">
                {firstName.slice(0, 1).toUpperCase()}
              </span>
              <span className="sr-only">Account menu</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="truncate">
                {fullName}
                {profile.username ? <div className="truncate text-xs font-normal text-muted-foreground">@{profile.username}</div> : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={signOut}>
                <LogOut className="mr-2 h-4 w-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 pt-6">
        <p className="mb-3 text-sm font-semibold text-muted-foreground">
          Hey, <span className="text-foreground">{firstName}</span> — let's lift.
        </p>
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-background/95 backdrop-blur md:hidden">
        <div className="mx-auto grid max-w-md grid-cols-3">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-1 py-3 text-xs font-semibold text-muted-foreground"
              activeProps={{ className: "text-primary" }}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}

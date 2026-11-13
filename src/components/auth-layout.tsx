import type { ReactNode } from "react";
import { Dumbbell, LineChart, Share2 } from "lucide-react";
import { Logo } from "@/components/logo";

export function AuthLayout({ title, accent, subtitle, children }: { title: string; accent: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-hero">
      <div className="mx-auto flex min-h-screen max-w-md flex-col px-6 py-8">
        <Logo />
        <div className="flex flex-1 flex-col justify-center py-10">
          <h1 className="font-display text-5xl font-black uppercase leading-[0.95]">
            {title}
            <br />
            <span className="text-primary">{accent}</span>
          </h1>
          <p className="mt-4 text-muted-foreground">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <ul className="mt-10 space-y-3 text-sm text-muted-foreground">
            <li className="flex items-center gap-3"><Dumbbell className="h-4 w-4 text-primary" /> Log a set in three taps</li>
            <li className="flex items-center gap-3"><LineChart className="h-4 w-4 text-primary" /> Weight, volume and PR charts</li>
            <li className="flex items-center gap-3"><Share2 className="h-4 w-4 text-primary" /> Share a read-only link with friends</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export function Field({
  id,
  label,
  error,
  hint,
  ...props
}: { id: string; label: string; error?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div>
      <label htmlFor={id} className="text-sm font-semibold">
        {label}
      </label>
      <input
        id={id}
        name={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className="mt-1.5 h-12 w-full rounded-xl border border-border bg-background px-3 text-base outline-none transition-colors focus:border-primary aria-invalid:border-destructive"
        {...props}
      />
      {error ? (
        <p id={`${id}-error`} className="mt-1.5 text-sm text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="mt-1.5 text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

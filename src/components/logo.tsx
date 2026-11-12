import { Link } from "@tanstack/react-router";

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary font-display text-lg font-black text-primary-foreground">
        IL
      </span>
      <span className="font-display text-2xl font-extrabold uppercase tracking-wide">IronLog</span>
    </Link>
  );
}

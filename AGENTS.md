<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Workout math (presets, volume, PRs, splits, streaks) lives in `src/lib/workout.ts` as pure functions with tests in `src/test/workout.test.ts` — keeps rules testable and shared by app + public page.
- Signed-in data is read/written from the browser client under RLS (`src/lib/workout-queries.ts`); pages under `_authenticated` load via `ensureQueryData` + `useSuspenseQuery`.
- Public sharing goes only through security-definer RPCs `get_shared_profile` / `get_shared_sets` (gated by `profiles.share_enabled`), called from a publishable-key server function — tables themselves have no anon access.
- One auth listener lives in `src/components/auth-provider.tsx`; don't add per-page `onAuthStateChange` subscribers.
- Accounts are username + password: usernames map to a synthetic never-emailed address (`usernameToEmail` in `src/lib/account.ts`, tested in `src/test/account.test.ts`); sign-up runs through the public `createAccount` server fn, which creates pre-confirmed users with the admin client so no confirmation email is ever needed. Uniqueness is enforced by a case-insensitive unique index on `profiles.username`.
- `/auth` only redirects to `/login` — the managed `_authenticated` gate still targets `/auth`.
- Page-level rules live in pure modules with injected dependencies (`src/lib/create-account.ts`, `signup-flow.ts`, `share.ts`) so they're unit-tested without a server; `src/test/integration/backend.test.ts` checks privacy/sharing against the live database and skips when server credentials are absent.

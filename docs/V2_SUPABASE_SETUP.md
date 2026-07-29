# Supabase setup (Phase 6 cloud sync)

Manual dashboard steps. Do **not** commit real keys or passwords.

## 1. Create project

1. Open [Supabase](https://supabase.com) and create a **Free** project.
2. Prefer an **EU** region when available (closest to your users / GDPR preference).
3. Wait until the project is healthy.

## 2. Copy API values

1. Open **Project Settings → API** (or **Data API**).
2. Copy:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **Publishable** (anon) key → `VITE_SUPABASE_PUBLISHABLE_KEY`

Do **not** copy or use the **service role** key in this app.

## 3. Local environment

Create `.env.local` in the repo root (gitignored via `.env.*`):

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_PUBLISHABLE_KEY
```

Confirm `.env.local` is ignored (`git check-ignore -v .env.local`).

Optional template: copy `.env.example` → `.env.local` and fill values.

## 4. GitHub Actions (production build)

The deploy workflow injects Vite env vars at build time. In the GitHub repo:

**Settings → Secrets and variables → Actions**

Create repository **secrets** (or variables):

| Name | Value |
|---|---|
| `VITE_SUPABASE_URL` | Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Publishable key |

These are read by `.github/workflows/deploy.yml` during `npm run build`.

Build still succeeds without them; the app then runs in **Local only / Cloud sync not configured** mode.

## 5. Auth URL configuration

**Authentication → URL Configuration**

**Site URL:**

```text
https://elvanakbas.github.io/workout-app/
```

**Redirect URLs** (add each that your Supabase dashboard accepts):

```text
https://elvanakbas.github.io/workout-app/
https://elvanakbas.github.io/workout-app/#/
http://127.0.0.1:4173/
http://127.0.0.1:4173/#/
http://localhost:5173/
http://localhost:5173/#/
```

### HashRouter limitation

This app uses **HashRouter** (required for GitHub Pages). OAuth / email-confirm redirects that rely on path-based deep links may land on `/workout-app/` with tokens in the hash or query. The Supabase JS client typically recovers the session from the URL hash on load. Password reset emails should redirect to the Site URL; the Account screen handles recovery when a session exists.

If the dashboard rejects `#/*` wildcards, use the explicit `#/` entries above.

## 6. Apply database SQL

1. Open **SQL Editor**.
2. Run `supabase/migrations/001_initial_cloud_sync.sql` (see `supabase/README.md`).
3. Confirm RLS is enabled on all five user tables.

## 7. Email auth

1. **Authentication → Providers → Email** — enable email/password.
2. Decide whether **Confirm email** is required (Free projects often enable it). Document your choice for testers.
3. Enable **Forgot password** / recovery emails as needed.

## Security summary

| Key | Where | Safe? |
|---|---|---|
| Publishable (anon) | Browser, Vite `VITE_*`, GitHub Actions secret for build | Yes, **with RLS** |
| Service role | Never in this repo / Pages / logs | **No — never expose** |
| DB password | Supabase dashboard only | **No — never expose** |

## After setup

1. `npm run dev` with `.env.local` filled.
2. Create a test account from the Account screen.
3. Confirm first-sync ownership prompt before any upload.
4. Deploy to `main` only after secrets are set if you want production sync live.

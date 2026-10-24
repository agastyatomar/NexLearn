# NexLearn on Cloudflare — from zero to live URL in ~15 minutes

Single source of truth for shipping the site for free with **one** Cloudflare
account. After this, nobody who gets your link has to install anything — the
Next.js app **and** the `/api` (Hono) run together in one Worker with a D1
SQLite database. All first-party: no CORS, session cookies stay on your domain.

```
Browser ──> Cloudflare Worker (nexlearn)
              ├── @opennextjs/cloudflare → Next.js app (SSR + assets)
              └── /api/* → Hono handlers (auth, progress, economy,
                           community SSE, leaderboard, AI helper)
                      └── Cloudflare D1 (SQLite) — the whole database
```

**LIVE DEPLOYMENT:** nexlearn.agastyatomar50.workers.dev (via the GitHub Actions
pipeline below — the whole flow is automatable without touching the dashboard).

## 0. What you need

- A repo on GitHub (this one, with the `feature/cloudflare-native-deploy` branch pushed).
- A Cloudflare account (free tier fits NexLearn's traffic comfortably).
- `gh` CLI authenticated for secret setup (or manual dashboard access).

## 1. Create the account + API token (~10 min)

1. Sign up at <https://dash.cloudflare.com/sign-up> (email + password, skip card details).
2. In the dashboard open **Profile → API Tokens → Create Token**.
3. Use the **Edit Cloudflare Workers** template, then additionally enable:
   - **Workers Scripts — Edit** (account) — REQUIRED for wrangler deploy
   - **Workers KV Storage — Edit** (account)
   - **D1 — Edit** (migrations + seed import)
   - **Account Settings — Read** (needed to find your account id)
   - **Workers Routes — Edit** (zone)
   - Account Resources: **All accounts**
4. Save the token somewhere private. **Never commit it.**
5. Grab your **Account ID** from the dashboard home page (right sidebar).

## 2. Create the D1 database (2 min)

From any Linux/macOS machine (or GitHub Codespaces) with Node 22+:

```bash
npx wrangler d1 create nexlearn
```

Copy the printed `database_id`. You'll use it twice below.

> Can't run wrangler anywhere? Create the DB from the dashboard:
> **Storage & Databases → D1 → Create database → name `nexlearn`**
> and use its Database ID everywhere.

## 3. Put the database id into the config (1 min)

Edit `frontend/wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "nexlearn",
    "database_id": "PASTE-db-id-here",
    "migrations_dir": "worker/d1/migrations"
  }
]
```

Commit this change to the deploy branch.

## 4. Migrate + seed the database (5 min)

The schema lives in `frontend/worker/d1/migrations/0001_init.sql`; course
content (all three tracks) is already compiled into
`frontend/worker/d1/content-seed.sql`.

Option A — phone-friendly (REST import works on any OS):

```bash
cd frontend
bun scripts/seed-d1.ts              # regenerate the SQL if you changed content
export CLOUDFLARE_API_TOKEN=...
export CLOUDFLARE_ACCOUNT_ID=...
export D1_DATABASE_ID=...
bun scripts/seed-d1.ts --apply
```

Option B — wrangler on a desktop:

```bash
cd frontend
npx wrangler d1 migrations apply nexlearn --remote
npx wrangler d1 execute nexlearn --remote --file=worker/d1/content-seed.sql
```

## 5. Deploy the Worker — GitHub Actions (recommended, 1 command)

The repo ships `.github/workflows/deploy-workers.yml` (workflow_dispatch):
checkout → bun install → `bun run cf:build` → `wrangler deploy` →
`wrangler secret put JWT_SECRET`. It runs on ubuntu-latest, so the Android
workerd limitation is irrelevant.

```bash
# one-time secrets (encrypted in the repo's Actions store):
gh secret set CLOUDFLARE_API_TOKEN    -R agastyatomar/NexLearn --body "..."
gh secret set CLOUDFLARE_ACCOUNT_ID   -R agastyatomar/NexLearn --body "..."
gh secret set JWT_SECRET              -R agastyatomar/NexLearn --body "$(openssl rand -base64 48)"

# deploy (any time):
gh workflow run deploy-workers.yml -R agastyatomar/NexLearn --ref feature/cloudflare-native-deploy
gh run watch -R agastyatomar/NexLearn       # follow the run live
```

Notes: the workflow file must ALSO exist on the default branch for
`gh workflow run` dispatch to resolve (committed to `main` as well). If the
token shorts "No access to the specified service" or "Cannot create the
worker" during deploy, add **Workers Scripts — Edit (account)** to the token's
permissions; the token VALUE does not change when editing permissions.
Optionally pre-create the script via API (PUT /workers/scripts/nexlearn) to
skip wrangler's existence pre-check on a fresh account.

## 5b. Alternative: Workers Builds via dashboard (5 min)

Dashboard → **Workers & Pages → Create → Workers → Import from git repo**

| Setting | Value |
|---|---|
| Repository | `agastyatomar/NexLearn` |
| Branch | `feature/cloudflare-native-deploy` (or `main` once merged) |
| Root directory | `frontend` |
| Build command | `bun install && bun run cf:build` * |
| Deploy command (wrangler) | `npx wrangler deploy` |

*`cf:build` = `next build` + `opennextjs-cloudflare build`, wired in
`frontend/package.json`. The build runs **in Cloudflare's Linux builders**, so
this phone's workerd limitation is irrelevant. If Cloudflare's default
Node/bun pairing throws, add environment variables `NODE_VERSION=22` and
`SEQUELIZE_AWS=false` — do **not** set a fake `wrangler` version.

After the first successful deploy the Worker is at:
`https://nexlearn.<your-subdomain>.workers.dev` — that's your live link.
(Live now: nexlearn.agastyatomar50.workers.dev — verified end-to-end:
health, register, session cookie, courses, lessons, progress XP+CC,
threads, economy.)

## 6. Secrets + settings (2 min)

Dashboard → Worker → **Settings → Variables & Secrets** (or `gh secret set`
+ the workflow's `wrangler secret put JWT_SECRET` step handles JWT already):

| Key | Type | Value |
|---|---|---|
| `JWT_SECRET` | Secret | set automatically by the Actions pipeline |
| `NODE_ENV` | Plain | `production` (already in wrangler vars) |
| `GOOGLE_CLIENT_ID` | Secret | optional — enables Google sign-in |
| `APPWRITE_ENDPOINT/PROJECT_ID/BUCKET_ID/API_KEY` | Secret | optional — avatar uploads |
| `GROQ_API_KEY` or `OPENROUTER_API_KEY` | Secret | optional — AI hint helper |

Then **Settings → Triggers → Cron**: `* * * * *` should already be there from
`wrangler.jsonc` (drives the AI-first-reply timer).

## 7. Verify the deploy (2 min)

```bash
curl -s https://your-worker.workers.dev/api/health
# {"ok":true,"service":"nexlearn-worker","env":"production"}

curl -s -X POST https://your-worker.workers.dev/api/auth/register \
  -H 'content-type: application/json' \
  -d '{"username":"snehal","email":"snehal@example.com","password":"!Test1234"}'
# {"ok":true,"user":{...}} → then open the site itself and register in the UI
```

Then fire up `https://your-worker.workers.dev` — the onboarding, JS from Zero
course, XP/streak/hearts economy, community threads and leaderboard all work
against D1.

## 8. Faster deploys / Cloudflare preview

- Every push to the deploy branch rebuilds the Worker automatically.
- New content: edit `backend/src/seed`, run `bun scripts/extract-content.ts`
  (in `frontend/`), commit, and re-run step 4's seed (ids are deterministic —
  learners' progress survives re-seeding).

## Troubleshooting

| Symptom | Fix |
|---|---|
| Build fails at `opennextjs-cloudflare build` and mentions workerd binaries | Cloudflare's builders run Linux — retry once; if it persists add `"NEXT_DEV_ENGINE": "turbopack"` in the repos env (only affects local), and file an issue |
| `Error: D1 binding DB is not configured` on the health endpoint | The D1 block in `wrangler.jsonc` wasn't deployed — check Step 3 was in the deploy commit |
| Registration 500s | Check `JWT_SECRET` was set wrangler-side, then look in `Workers → Logs → Live` |
| Cron not firing the AI reply | Confirm the AI key secret exists; the cron only posts replies once ≥1 thread needs one |
| Need a custom domain | Workers → Settings → Domains & Routes → add your domain (needs a zone on the same account) |

## Free-tier headroom notes

- D1 free: 5M reads/day, 100k writes/day — the platform's read traffic is
  pagination + course loads; writes are progress/step rows (tiny).
- Workers free: 100k requests/day; OpenNext adds a few asset requests but a
  small cohort is far below that.
- Community SSE uses + each live tab counts as one Worker invocation per few
  seconds — for a big audience move to the $5 Workers Paid tier (SSE-friendly,
  still cheap).
- Rate limiting is currently per-isolate in memory (documented); if abuse
  becomes a concern, move to Cloudflare Radar/WAF rules or a Durable Object.

# Daylist

Daylist is a single-user, PostgreSQL-backed task manager. It is a React/Vite client behind a small Express API. Docker Compose is the canonical local environment: it isolates the web client, API, and database in the way a Python virtual environment cannot for a JavaScript/PostgreSQL application.

## Start locally

Prerequisites: Docker Desktop with Compose, or Node 22+ for non-container checks.

```powershell
Copy-Item .env.example .env
docker compose up --build
docker compose exec api npm run migrate
```

Open http://localhost:5173. Stop services with `docker compose down`; add `-v` only when intentionally discarding the local database volume.

`server/db/schema.sql` is a readable full-schema snapshot for review or a clean manual bootstrap. Apply `server/db/migrations/` through `npm run migrate` for normal development, since migrations are the versioned source of truth.

## Verification commands

The following commands are safe to run from the repository root after `npm install`:

```powershell
npm run lint
npm run typecheck
npm test
npm run build
```

Docker API checks:

```powershell
docker compose exec api npm run migrate
docker compose run --rm api npm test
Invoke-RestMethod http://localhost:5173/api/health
```

## Verification recorded in this workspace

`npm run lint`, `npm run typecheck`, `npm test` (8 tests), and `npm run build` passed on 2026-08-28. Docker Compose started healthy `web`, `api`, and `db` services; migrations are re-runnable; `/api/health` returned `{"status":"ok"}` through the Vite `/api` proxy; and a scheduled item was created and exported successfully as `text/calendar`. Native push configuration was also verified with freshly generated credentials stored only in ignored `.env`.

## Environment variables

Copy `.env.example` to `.env`. `POSTGRES_*` values configure the local container; `DATABASE_URL` is used for host-run migration/API commands. Never commit `.env`.

## API

| Method | Path | Description |
| --- | --- | --- |
| GET | `/api/health` | Returns `{ "status": "ok" }` |
| GET | `/api/todos?status=all|active|completed` | Lists newest-first tasks |
| POST | `/api/todos` | Creates `{ "title": string }` |
| PATCH | `/api/todos/:id` | Sets `{ "isDone": boolean }`; an empty body toggles for lab compatibility |
| DELETE | `/api/todos/:id` | Deletes a task and returns `204` |
| GET | `/api/todos/:id/calendar` | Downloads a scheduled task as an `.ics` calendar event |
| GET | `/api/notifications/status` | Returns Push API configuration and device subscription status |
| GET | `/api/notifications` | Lists delivered reminders |
| PATCH | `/api/notifications/read` | Marks delivered reminders read |
| POST/DELETE | `/api/notifications/subscription` | Adds/removes a browser Push API subscription |

Errors use `{ "error": { "code": string, "message": string } }`.

## Scheduling and native push reminders

Use **Schedule it** to add a future date/time, duration, venue or HTTPS meeting link, and reminder offset. The Agenda tab sorts scheduled items and flags active time overlaps; each scheduled item can be exported as a standard `.ics` file for Google Calendar, Apple Calendar, Outlook, and other calendar clients.

The Alerts tab uses the browser Push API and a service worker, so a configured reminder can arrive even after the tab closes. Native browser push requires HTTPS in production (localhost is allowed for development) and unique VAPID credentials. Generate them locally, keep the private key only in ignored `.env`, then restart the API:

```powershell
node scripts/configure-vapid.cjs
docker compose up --build --detach
```

The helper writes unique values to ignored `.env` without displaying the private key. Set `VAPID_SUBJECT` to an operator-controlled contact address for production; never commit or log the private key. Browser permission can be denied or later revoked, in which case Daylist retains every scheduled item and shows a clear status instead of losing data.

## Troubleshooting

- If `docker compose` cannot connect, start Docker Desktop and rerun `docker compose up --build`.
- If the API says the relation is missing, run `docker compose exec api npm run migrate`.
- If a running development container predates a dependency change, run `docker compose exec api npm install`, then `docker compose restart api`.
- If port 5173 or 4000 is occupied, change `WEB_PORT` or `API_PORT` in `.env` and restart Compose.

## Deployment boundary

## Render

Deploy one Render **Web Service** from the repository root. It serves the built Daylist client at `/` and the API at `/api`.

```text
Build Command: npm ci && npm run build
Start Command: node server/dist/server.js
Pre-Deploy Command: npm run migrate --workspace=server
```

Set `DATABASE_URL` from Render PostgreSQL plus the three `VAPID_*` values. Render supplies `PORT`; do not set a fixed production port.

AWS deployment is documented in [docs/aws-deployment.md](docs/aws-deployment.md). No cloud resource is created by this repository or its local commands.

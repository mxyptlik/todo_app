# Master build prompt - paste this into Codex

You are the implementation owner for a production-quality **single-user To-Do application**. Build the full repository autonomously from an empty or nearly empty directory. Treat the root `AGENTS.md` as binding instructions.

The app is based on a lab architecture: a React frontend, Express API, PostgreSQL database, and nginx in front of the deployed application. The original lab demonstrates four essential actions - list tasks, add a task, toggle completion, and delete a task. Preserve those capabilities exactly, while making the experience feel like a polished modern product rather than a classroom demo.

## Outcome

Deliver a complete, runnable repository named `todo-app` that a non-developer can start locally with one documented command. It must have:

- A responsive, accessible, high-quality task-management interface.
- A React + Vite + TypeScript client.
- An Express + TypeScript API backed by PostgreSQL.
- Safe, parameterized SQL using `pg`; do not use an ORM for this small application.
- A Docker Compose development environment as the canonical isolated environment.
- A clear `.env.example`, database migration, tests, developer documentation, nginx configuration, and PM2 ecosystem file.
- An AWS deployment outline only. Do **not** create AWS resources, sign into AWS, spend money, or deploy without an explicit later request.

Do all reasonable work yourself. Do not ask me to create boilerplate, choose CSS values, run ordinary commands, or manually test the app. Pause only for an unavoidable account authorization or a secret that cannot be invented safely.

## Non-negotiable execution rules

1. Read `AGENTS.md` before changing anything.
2. First inspect the repository and preserve any user files. If it is empty, initialize the project structure yourself.
3. Use a virtualized local development environment:
   - The canonical environment is Docker Compose, which isolates the web client, API, and PostgreSQL database.
   - Pin the JavaScript runtime in `.nvmrc` (Node 22 LTS unless the repository already pins a compatible version).
   - Keep all Node dependencies project-local. Never use a global `npm install` for application packages.
   - Do not create a Python `.venv` merely for appearance: Python venvs do not isolate React or Express. Docker Compose plus the pinned Node runtime is the required virtual environment for this JavaScript stack.
4. Use the available UI MCP workflow before implementation. If the MCP server is connected, use it. If it is not connected, continue with the explicit visual specification below and report the exact one-time connection action at the end; do not pretend that a tool call occurred.
5. Do not commit secrets, database passwords, API keys, or `.env` files. Do not copy a user token into project documentation.
6. Do not perform AWS, GitHub publishing, or external account actions. Prepare all files needed for those steps and document the handoff.

## Required UI MCP workflow

Use the UI tools in this order when available:

1. **21st MCP** - use it for interface exploration and polished component patterns. Request inspiration and/or search for a focused productivity/task-list UI, then obtain only the components that genuinely fit this app. Use its output as inspiration, inspect it, and integrate it cleanly rather than blindly pasting a whole generated page.
2. **Figma remote MCP** - if available, create a small editable Figma design called `Todo App - Design System and Screens`. Include desktop and mobile task-list frames plus the core component states. Define reusable colour, typography, spacing, radius, and shadow tokens before coding. Then use the structured Figma context to keep implementation faithful.
3. If both are available, use 21st for component-quality references and Figma for the source-of-truth layout/tokens. Record the final design decisions in `docs/design-system.md`.
4. If either tool requires the user to authenticate, continue the build using the visual specification below and put the non-blocking setup instruction in the final report.

Never make the runtime application depend on either MCP. They are development tools only.

## Product and UX specification

### Product scope

Build a personal task manager for one user. Do not add authentication, accounts, payments, collaboration, notifications, cloud synchronization, or a complex settings area. The product should make it effortless to capture, complete, and remove daily tasks.

### Essential behavior

- Fetch and show tasks newest first on load.
- Add a task with a title between 1 and 200 trimmed characters.
- Toggle a task between active and completed.
- Delete a task.
- Persist all task changes in PostgreSQL; a browser refresh and server restart must not lose data.
- Support client-side views for **All**, **Active**, and **Completed**.
- Show a concise completion summary, for example `3 of 7 completed` and a subtle progress indicator.
- Include empty, loading, error, and mutation-in-progress states. A failed update must not silently lose the user action.

### Visual direction

Create a calm, confident productivity product - not a generic dashboard and not an overly decorative "AI" interface.

- Layout: a spacious centered workspace, with a compact brand mark/header, an immediate task composer, progress summary, filter tabs, and a legible task list. Use a narrow content column on mobile and a generous but restrained desktop canvas.
- Palette: warm near-white page background, graphite/slate text, deep navy for structure, a single vivid blue accent for primary actions and focus, and muted green only for completion. Use design tokens/CSS variables rather than scattered raw values.
- Typography: use a modern, highly legible sans-serif stack. Establish an explicit type scale; do not rely on browser defaults.
- Components: one obvious primary action; touch-friendly check control; icon-only delete control with an accessible label and tooltip; clear hover, focus-visible, disabled, pressed, and completed states.
- Motion: very short, purposeful transitions. Respect `prefers-reduced-motion`.
- Responsive behavior: work cleanly from 320px wide through large desktop. No horizontal scrolling, clipped controls, or hover-only functionality.
- Accessibility: semantic form controls and lists, visible keyboard focus, logical tab order, sufficient colour contrast, ARIA live feedback for mutation errors/success where useful, and labels for all non-text controls.

Do not use a stock template unchanged, massive hero imagery, marketing sections, gradients that reduce readability, or generic lorem ipsum. Use realistic task labels in development seed data only.

## Technology choices

Use the following unless a pre-existing repository makes a different compatible choice necessary:

| Area | Required choice |
| --- | --- |
| Client | React, Vite, TypeScript, Tailwind CSS, shadcn/ui primitives where helpful, Lucide icons |
| Client state/data | Small typed API client plus React state; avoid Redux/query libraries unless they solve a demonstrated need |
| API | Node.js, Express, TypeScript, `pg`, `zod`, `dotenv`, `helmet`, request logging |
| Database | PostgreSQL 16+ and SQL migration files |
| Local isolation | Docker Compose with `web`, `api`, and `db` services |
| Tests | Vitest; Supertest for API behavior; React Testing Library for core client flows |
| Production handoff | nginx static-file serving + `/api/` reverse proxy, PM2 for the Express process |

Keep the dependency list lean. Do not add a package merely to avoid a few lines of clear code.

## API contract

Use JSON. All application routes live below `/api`.

| Method and path | Purpose | Request | Successful response |
| --- | --- | --- | --- |
| `GET /api/health` | Service health check | none | `200 { "status": "ok" }` |
| `GET /api/todos` | List tasks, newest first | optional `status=all|active|completed` | `200 Todo[]` |
| `POST /api/todos` | Create task | `{ "title": string }` | `201 Todo` |
| `PATCH /api/todos/:id` | Set completion state; support legacy body-less toggle too | `{ "isDone": boolean }` preferred | `200 Todo` |
| `DELETE /api/todos/:id` | Delete task | none | `204` |

The `Todo` response shape must be consistent:

```ts
type Todo = {
  id: number;
  title: string;
  isDone: boolean;
  createdAt: string;
  updatedAt: string;
};
```

Requirements:

- Parse and validate IDs and request bodies with Zod.
- Use parameterized queries everywhere. Never concatenate user input into SQL.
- Return a predictable error envelope, e.g. `{ "error": { "code": "VALIDATION_ERROR", "message": "..." } }`.
- Return `404` for missing task IDs and a useful `500` envelope for unexpected failures without leaking database internals.
- Ensure graceful API shutdown closes the database pool.

## Database requirements

Create a migration such as `server/db/migrations/001_create_todos.sql` with at minimum:

```sql
CREATE TABLE IF NOT EXISTS todos (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL CHECK (char_length(btrim(title)) BETWEEN 1 AND 200),
  is_done BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

Implement a migration runner or a dependable command that applies migrations once and is safe to re-run. The API must not assume the table exists before the migration has been applied. Add a small opt-in seed command for development; seed data must never run automatically against a production database.

## Repository structure

Use this structure or a clearly equivalent one:

```text
todo-app/
  AGENTS.md
  README.md
  .env.example
  .gitignore
  .nvmrc
  compose.yaml
  client/
  server/
    src/
    db/migrations/
    tests/
  deploy/
    nginx/todo-app.conf
    pm2/ecosystem.config.cjs
  docs/
    architecture.md
    design-system.md
    aws-deployment.md
  scripts/
    verify.sh
```

Document any intentional deviation. Do not put application source, database migrations, or deploy configuration only in a README code block - create the real files.

## Dockerized development environment

Create a secure, low-friction `compose.yaml`.

- `db`: PostgreSQL with a named volume and a health check. Expose its port only when truly useful for local development; it must not be reachable in the future production topology.
- `api`: waits for a healthy database, uses the server Dockerfile, gets configuration from `.env`, and exposes an internal/API development port.
- `web`: runs Vite for local development, hot reloads, and proxies `/api` to the API service.
- Provide clear commands in the README, ideally:
  - `cp .env.example .env`
  - `docker compose up --build`
  - `docker compose exec api npm run migrate`
  - `docker compose run --rm api npm test`
  - `docker compose down`
- If a command differs because of an implementation detail, document the actual tested command.

The project must start cleanly from a fresh clone after a user supplies only local, non-secret development values. Never hard-code or commit default production credentials.

## Deployment handoff - document only

Create `docs/aws-deployment.md` based on this production shape:

```text
Browser (HTTPS)
  -> nginx on an Ubuntu EC2 instance
      -> built React static files
      -> /api/ reverse-proxied to Express on 127.0.0.1
          -> PostgreSQL (lab mode: local only; production upgrade: RDS)
```

The document must cover:

- VPC/public-subnet/internet-gateway/route-table/security-group prerequisites.
- Inbound rules: SSH only from the operator's current IP, HTTP/HTTPS public, and no public PostgreSQL or Express port.
- Tags/naming as replaceable placeholders, never another person's account ID or class/pair value.
- Ubuntu server setup, Node runtime, PostgreSQL, nginx, PM2, migration, client build, and deploy ordering.
- A production secret strategy: AWS Systems Manager Parameter Store or Secrets Manager preferred; a root-owned `.env` with restrictive permissions is an acceptable lab fallback.
- nginx config validation, PM2 startup persistence, health checks, HTTPS/domain steps, logs, update procedure, rollback, cost controls, and teardown sequence.
- A clear note that deployment needs explicit user authorization and that no AWS action was performed during development.

Create the actual nginx and PM2 configuration files that this document references. The nginx file must serve the Vite build, fall back to `index.html` for client routes, proxy `/api/` to `127.0.0.1`, set appropriate forwarding headers, and not expose the API port directly.

## Documentation and quality bar

Write these files as part of the deliverable:

- `README.md`: purpose, architecture summary, prerequisites, exact local start/stop/test commands, environment variables, API table, troubleshooting, and deployment boundary.
- `docs/architecture.md`: concise request/data flow, module boundaries, and why Docker Compose is the valid virtualized environment for this JavaScript app.
- `docs/design-system.md`: MCP use (or unavailable-tool fallback), design direction, tokens, component states, keyboard/accessibility decisions, responsive decisions, and screenshots or a Figma link if available.
- `docs/aws-deployment.md`: the outline above.

Include comments only where the code intent is non-obvious. Prefer readable functions, strict TypeScript, meaningful names, and small modules.

## Verification gates

Do not claim completion until you have run and fixed the following where the environment permits:

1. Dependency install/build succeeds.
2. Docker Compose starts the database, API, and client without unhealthy services.
3. Migration applies to a clean database and is safely repeatable.
4. API contract tests cover create, list order, input validation, explicit toggle, body-less legacy toggle, missing ID, delete, and health endpoint.
5. Client tests cover adding, filtering, toggling, deleting, loading/error rendering, and basic keyboard behavior.
6. Lint, typecheck, and production client build pass.
7. Manually inspect the running app at desktop and mobile widths. Fix overflow, unreadable contrast, keyboard traps, and broken focus states.
8. Run a safe smoke test against the API through the same `/api` path the browser uses.

If a test cannot run because Docker, the required MCP, or another host capability is unavailable, clearly state the precise blocker, execute every other safe validation, and leave a one-command reproduction path. Do not downgrade quality merely to avoid a tool limitation.

## Completion response

At the end, give a short execution report containing:

- What was built and the stack actually used.
- Exact commands to run the project.
- Tests/builds that passed and any remaining blocked validation.
- Files created or changed.
- The Figma/21st MCP result or the one-time action needed to connect it.
- Explicit confirmation that AWS was documented only and no cloud resources were created.

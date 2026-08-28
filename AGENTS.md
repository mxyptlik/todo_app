# AGENTS.md - Todo App implementation contract

## Mission

Build and maintain a polished, single-user to-do application with a React client, Express API, PostgreSQL database, Docker Compose development environment, and a deployment-ready nginx/PM2 handoff. The repository is an implementation deliverable, not a tutorial-only code sample.

The guiding user experience is simple: capture a task quickly, understand what remains, complete it confidently, and trust that it persists.

## Operating principles

- Work autonomously. Inspect first, then implement, run, test, and document without asking the user to perform routine engineering work.
- Preserve user changes and existing project conventions. Do not rewrite unrelated files or delete useful work.
- Prefer the smallest robust solution. Do not add authentication, accounts, cloud sync, payments, analytics, or a heavy state-management framework.
- Maintain a clean, production-minded codebase even though this is a small application.
- Never claim a command, test, visual inspection, MCP call, deployment, or external action happened unless it actually happened.

## Environment and dependency rules

1. The canonical development virtual environment is Docker Compose. It must isolate `web`, `api`, and `db` services.
2. Keep a pinned Node version in `.nvmrc`. Use project-local dependencies and lockfiles.
3. Do not use global `npm install` for project dependencies. Do not add a Python `.venv` as a substitute for JavaScript isolation.
4. Keep secrets in ignored `.env` files only. Commit `.env.example` with non-sensitive placeholders. Never log secrets.
5. Do not install system packages or alter a developer's global configuration unless explicitly necessary and documented. Prefer Dockerfile images and local project tools.
6. Use reproducible commands. After modification, update `README.md` with the exact commands that were actually verified.

## Required stack and architecture

- Client: React, Vite, TypeScript, Tailwind CSS, accessible shadcn/ui primitives where they genuinely improve quality, Lucide icons.
- API: Express, TypeScript, `pg`, Zod validation, Helmet, structured error handling, request logging.
- Database: PostgreSQL with SQL migrations, not an ORM.
- Development: Docker Compose with health checks and persistent database volume.
- Deployment handoff: nginx serves static client files and proxies `/api/` to Express on loopback; PM2 keeps Express alive.

Favor strict TypeScript and narrow types at request/database boundaries. Avoid `any`, unsafe casts, unbounded input, and duplicated client/server contract logic.

## UI and MCP process

### Required behavior when tools are connected

1. Check whether the 21st MCP and/or Figma MCP tools are available before coding the UI.
2. If 21st is available, use it to explore polished task/productivity interface patterns and retrieve only relevant components or inspiration. Adapt output to the repository; do not blindly paste a whole page or introduce an unnecessary design system.
3. If Figma is available, create/update a compact editable file containing desktop and mobile frames, foundational tokens, and component states. Treat it as the visual source of truth.
4. Record the final decisions and any Figma URL in `docs/design-system.md`.
5. If no UI MCP is available, build to the prescribed design system and say exactly what connection step would enable it. This is not a reason to pause development.

### Visual standards

- Build an intentional task workspace, not a generic dashboard or a marketing landing page.
- Use a warm near-white page base, dark neutral text, deep navy structure, blue primary action/focus colour, and restrained green completion treatment. Express these as reusable CSS variables/tokens.
- Use a defined type scale, 4px or 8px spacing rhythm, clear hierarchy, large comfortable hit targets, and reduced-motion support.
- Provide visual states for loading, empty list, errors, disabled controls, hover, focus-visible, active/pressed, and completed tasks.
- Must be responsive from 320px upward and usable with keyboard only.
- Every icon-only action needs an accessible label. Do not convey task state with colour alone.

## Functional requirements

The application must:

- List todos newest first.
- Create a trimmed 1-200 character title.
- Toggle completion using explicit `isDone`; retain a body-less PATCH toggle for compatibility with the reference lab API.
- Delete a todo.
- Persist across refreshes/restarts.
- Filter All, Active, and Completed client-side or via supported API status query.
- Show actionable validation and network errors without discarding user input.
- Show progress such as completed versus total.

Required endpoints:

```text
GET    /api/health
GET    /api/todos?status=all|active|completed
POST   /api/todos
PATCH  /api/todos/:id
DELETE /api/todos/:id
```

All errors must use a predictable JSON envelope. IDs and bodies must be validated. All SQL must be parameterized. Do not return raw database error details to clients.

## Database rules

- Use `todos` with `id`, `title`, `is_done`, `created_at`, and `updated_at`.
- Store timestamps as `TIMESTAMPTZ`.
- Enforce title constraints in both Zod and SQL.
- Migrations must be versioned, re-runnable, and applied via a documented command.
- Do not auto-seed a database in production. Development seeds must be opt-in.
- Close the `pg` pool during graceful server shutdown.

## Security and deployment boundaries

- Do not make AWS calls, create cloud resources, sign into accounts, push code, or deploy unless the user separately authorizes it.
- The repository must contain a documented AWS plan, nginx config, and PM2 ecosystem configuration.
- In deployment documentation, state that only ports 80/443 are public; SSH is restricted to the operator's IP; API and PostgreSQL ports remain private.
- Use secret placeholders. Prefer AWS Secrets Manager or Systems Manager Parameter Store in a real deployment; document a restrictive local `.env` lab fallback.
- Never put database credentials in the Dockerfile, source, committed compose file, logs, screenshots, or docs.

## Testing and validation gates

Before declaring work complete, run the commands that are available and fix failures:

1. Lint, typecheck, and production build.
2. API tests for health, create, list ordering, invalid titles, explicit toggle, legacy toggle, missing ID, and delete.
3. Client tests for add, filter, toggle, delete, loading/error behavior, and keyboard submission.
4. Start the Compose environment and apply migrations to a clean database.
5. Smoke-test through `/api`, the same path nginx will proxy.
6. Inspect desktop and mobile layouts for responsive overflow, contrast, click/touch targets, and keyboard focus.

If a verification step is blocked by a missing host capability, identify the exact issue, run all other gates, and leave a reproducible command. Never suppress a failing test, lower compiler strictness, or delete a test to claim success.

## Required deliverables

Keep these current:

```text
README.md
.env.example
.nvmrc
compose.yaml
client/
server/
server/db/migrations/
deploy/nginx/todo-app.conf
deploy/pm2/ecosystem.config.cjs
docs/architecture.md
docs/design-system.md
docs/aws-deployment.md
scripts/verify.sh
```

The README must give fresh-clone instructions, environment variables, test/build commands, the API contract, and troubleshooting. Documentation must explain why Docker Compose is the valid virtualized environment for React/Express rather than a Python `venv`.

## Final handoff format

Return a concise report with:

- completed work and significant decisions;
- exact local start/test commands;
- validation results and any real blocker;
- changed files;
- UI MCP use or the one-time setup needed;
- explicit confirmation that AWS was documented only and not executed.

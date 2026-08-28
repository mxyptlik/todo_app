# Architecture

`web` is a Vite development server hosting the React client. Browser requests to `/api` are proxied to `api`, an Express process. The API validates request boundaries with Zod, runs parameterized `pg` queries, and persists to PostgreSQL `todos`. SQL migrations are versioned in `server/db/migrations` and recorded in `schema_migrations`.

The client owns small local UI state and a typed HTTP adapter. The API owns validation, error envelopes, database mapping, and graceful pool shutdown. This keeps the browser independent from PostgreSQL details.

Docker Compose is the valid virtualized local environment: it isolates the JavaScript processes, their project-local dependencies, and the PostgreSQL service on a shared private network. A Python `venv` only isolates Python packages and cannot provide this boundary for React, Express, or PostgreSQL.

# AuzGuard — Sovereign AI Gateway

Sovereign-by-default AI gateway for regulated industries. Ship policies and routes with confidence, backed by immutable audit trails.

## Setup Guide

### 1. Prerequisites

- Node.js 18+ and npm (bundled with Node)
- PostgreSQL 14+ with a running local instance
- Git for cloning the repository (or download a release archive)

Quick sanity checks:

```bash
node --version    # expect 18.x or higher
npm --version     # expect 6.x or higher
psql --version    # expect 14.x or higher
```

### 2. Clone and Install

```bash
git clone <your-repo-url>
cd AuzGuard
npm install              # backend/tooling deps
cd frontend
npm install              # frontend deps
cd ..
```

If you are using an existing clone, pull latest changes and re-run `npm install` whenever dependencies change.

### 3. Configure Environment Variables

Copy the provided template and update it with local credentials:

```bash
cp env.example .env
```

Important keys to review:

- `DATABASE_URL` – your Postgres connection string, including database name and credentials.
- `MODEL_GARDEN_STUB_RESPONSES` – keep `true` for safe offline stubs, set `false` when you have real model API keys.
- `OPENAI_API_KEY`, `GEMINI_API_KEY`, `OLLAMA_BASE_URL` – optional providers when stubs are disabled.
- `JWT_SECRET`, `HASH_SALT` – use unique values in any shared or production environment.
- `PORT` – backend port (defaults to `3001`); the Vite dev server runs on `3000`.

The `.env` file is ignored by Git—never commit secrets.

### 4. Prepare the Database

Ensure PostgreSQL is running and create an `auzguard` database (or update `DATABASE_URL` to point to an existing database), then run:

```bash
npx prisma generate
npx prisma db push
```

Use `npx prisma migrate dev --name init` if you prefer tracked migrations for local development. Prisma Studio (`npx prisma studio`) is handy for inspecting records.

### 5. Launch the App

```bash
npm run dev
```

This concurrently starts:

- Fastify backend at `http://localhost:3001`
- Vite frontend at `http://localhost:3000`

On first run the backend seeds a baseline AU ruleset, default routes, and model pools.

Prefer separate terminals? Use `npm run dev:backend` and `npm run dev:frontend` (or `npm run dev` inside `frontend/`) instead.

### 6. Verify Access

Open `http://localhost:3000`, pick a role (Viewer, Developer, Compliance, Admin), and sign in—no password needed in development mode. Use the Simulator to run a sample request and confirm responses hit the seeded policies.

### 7. Optional Configuration

- **Branding:** copy `frontend/.env.example` to `frontend/.env` and set `VITE_BRAND_NAME`, optional `VITE_BRAND_LOGO_URL`, and `VITE_BRAND_POWERED_BY`. The login screen also supports tenant-aware branding via the `org_id` field which fetches `/api/branding`.
- **Real model providers:** supply API keys for OpenAI or Gemini, or point `OLLAMA_BASE_URL` at a local Ollama instance; then set `MODEL_GARDEN_STUB_RESPONSES=false`.
- **Production build:** run `npm run build` followed by `npm start` to serve the compiled backend (`dist/`) and the prebuilt frontend (`frontend/dist/`) behind Fastify on port `3001`.

## What You’ll Do

- Sign in as Viewer/Developer/Compliance/Admin to see scoped features
- Run a request in Simulator to see allow/block decisions and traces
- Tweak a rule in Policy Editor and re-run the simulation
- Inspect immutable Audit logs and verify integrity proofs
- Explore Routes and Model Pools, including onshore-only routing

## Project Structure

- Backend: Fastify + TypeScript (`src/`)
- Frontend: React + Vite + Tailwind (`frontend/`)
- Database: Prisma schema (`prisma/schema.prisma`)
- Schemas and samples: `schemas/`, `sample_policy_import.json`

## API (Selected)

- Policies: `GET /api/policies`, `PUT /api/policies/:policyId`
- Evaluate: `POST /api/evaluate`
- Audit: `GET /api/audit`, `POST /api/audit/verify`
- Routes: `GET /api/routes/pools`, `POST /api/routes/targets`

Full API is discoverable under `/api/*` and in the code under `src/routes`.

## Rules Language (CEL-like)

- Literals: `true`, `false`, `'string'`, `123`
- Operators: `&&`, `||`, `!`, `==`, `!=`, `>`, `<`, `>=`, `<=`
- Helpers: `has('field')`, `in(array, value)`

Examples:

```
data_class in ['health_record', 'medical_data'] && destination_region != 'AU'
personal_information == true && destination_region != 'AU'
environment in ['sandbox', 'testing', 'development']
```

## Development

- Tests: `npm test`
- Migrations: `npx prisma migrate dev`
- Build: `npm run build`

## Security

- Immutable audit log with hash chain and Merkle proofs
- JWT-based auth and role-based access control
- Data redaction for sensitive fields

## License & Contributing

- MIT License — see `LICENSE`
- PRs welcome: fork → branch → changes → tests → PR

## Support

Open a GitHub issue or contact the team.

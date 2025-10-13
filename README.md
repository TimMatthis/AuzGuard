# AuzGuard — Sovereign AI Gateway

Sovereign-by-default AI gateway for regulated industries. Ship policies and routes with confidence, backed by immutable audit trails.

## Quickstart

- Prereqs: Node.js 18+, PostgreSQL 14+
- TL;DR:
  - `npm install`
  - `cp env.example .env` and edit `DATABASE_URL` if needed
  - `npx prisma generate && npx prisma db push`
  - `npm run dev`
  - Open `http://localhost:3000` and pick a role to sign in (no password)

On first run the server seeds a baseline AU ruleset and model pools.

## What You’ll Do

- Sign in as Viewer/Developer/Compliance/Admin to see scoped features
- Run a request in Simulator to see allow/block decisions and traces
- Tweak a rule in Policy Editor and re-run the simulation
- Inspect immutable Audit logs and verify integrity proofs
- Explore Routes and Model Pools, including onshore-only routing

## Configuration

- Copy `env.example` to `.env` and review:
  - `DATABASE_URL` points to your Postgres instance
  - `MODEL_GARDEN_STUB_RESPONSES=true` enables safe, offline stubs
  - Optional: set `OPENAI_API_KEY`, `GEMINI_API_KEY`, or `OLLAMA_BASE_URL`
- `.env` is git-ignored; do not commit secrets

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

# How to Run AuzGuard

This guide provides step-by-step instructions for setting up and running the AuzGuard application on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

- **Node.js** version 18.0 or higher ([Download](https://nodejs.org/))
- **PostgreSQL** version 14.0 or higher ([Download](https://www.postgresql.org/download/))
- **npm** (comes with Node.js) or **yarn**
- **Git** (for cloning the repository)

Verify your installations:
```bash
node --version    # Should be 18.0 or higher
npm --version     # Should be 6.0 or higher
psql --version    # Should be 14.0 or higher
```

## Installation Steps

### 1. Clone the Repository (if not already done)

```bash
git clone <repository-url>
cd AuzGuard
```

### 2. Install Dependencies

Install both backend and frontend dependencies:

```bash
# Install root dependencies (backend)
npm install

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 3. Set Up PostgreSQL Database

Create a PostgreSQL database for AuzGuard:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database (in psql shell)
CREATE DATABASE auzguard;

# Exit psql
\q
```

Or use pgAdmin or another PostgreSQL management tool to create a database named `auzguard`.

### 4. Configure Environment Variables

Create a `.env` file from the example template:

```bash
cp env.example .env
```

Edit the `.env` file with your preferred text editor and update the following values:

```env
# Database - Update with your PostgreSQL credentials
DATABASE_URL="postgresql://username:password@localhost:5432/auzguard"

# JWT Configuration - Change these for production!
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_ISSUER="auzguard"
JWT_AUDIENCE="auzguard-api"

# Security - Change for production!
HASH_SALT="your-hash-salt-change-in-production"
WORM_MODE=true

# API Configuration
PORT=3001
NODE_ENV=development

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Audit Configuration
AUDIT_BATCH_SIZE=1000
MERKLE_TREE_HEIGHT=20

# Model Garden Configuration (Optional)
OPENAI_API_KEY=""
GEMINI_API_KEY=""
OLLAMA_BASE_URL="http://localhost:11434"
DEFAULT_MODEL_POOL=""
MODEL_GARDEN_STUB_RESPONSES=true
```

**Important Notes:**
- Replace `username` and `password` in `DATABASE_URL` with your PostgreSQL credentials
- For development, you can use `MODEL_GARDEN_STUB_RESPONSES=true` to work without real AI API keys
- The default frontend runs on `http://localhost:3000`
- The default backend runs on `http://localhost:3001`

### 5. Initialize the Database

Run Prisma commands to set up the database schema:

```bash
# Generate Prisma client
npx prisma generate

# Create database tables
npx prisma db push
```

**Alternative (for migrations):**
```bash
npx prisma migrate dev --name init
```

## Running the Application

### Development Mode (Recommended for Development)

Run both the backend and frontend concurrently:

```bash
npm run dev
```

This command starts:
- **Backend server** on `http://localhost:3001`
- **Frontend dev server** on `http://localhost:3000`

The application will automatically reload when you make changes to the code.

### Running Backend and Frontend Separately

If you prefer to run them in separate terminals:

**Terminal 1 - Backend:**
```bash
npm run dev:backend
```

**Terminal 2 - Frontend:**
```bash
npm run dev:frontend
```

Or navigate to the frontend directory:
```bash
cd frontend
npm run dev
```

### Production Mode

**1. Build the application:**
```bash
npm run build
```

This compiles:
- Backend TypeScript to JavaScript in the `dist/` directory
- Frontend React app to static files in `frontend/dist/`

**2. Start the production server:**
```bash
npm start
```

The backend serves both the API and the frontend static files on `http://localhost:3001`.

## Branding (White Label)

You can customize the company name and logo for each instance of the frontend.

Configure via `frontend/.env` (copy from the example):

```bash
cp frontend/.env.example frontend/.env
```

Edit `frontend/.env` and set:

```env
# Display name across the UI (sidebar, landing, login, chat)
VITE_BRAND_NAME=Your Company Name

# Optional: logo URL for the sidebar brand area
VITE_BRAND_LOGO_URL=https://your.cdn.com/path/to/logo.png

# Small tagline text (used where appropriate, e.g., Chat UI)
VITE_BRAND_POWERED_BY=powered by AuzGuard
```

Examples:
- For a CBA deployment, set `VITE_BRAND_NAME=CBA` and the logo URL. The Chat UI will show “CBA Chat — powered by AuzGuard”.
- If you omit the logo URL, only the name renders.

### Dynamic (tenant-aware) branding

The frontend fetches branding from the backend at `/api/branding`, optionally using an `org_id` parameter. On the Login page, enter an Organisation ID and click "Apply Brand" to refresh the branding for that tenant. The selected `org_id` is stored in localStorage and added to the URL.

## Accessing the Application

Once the application is running:

1. Open your browser and navigate to `http://localhost:3000` (development) or `http://localhost:3001` (production)
2. You'll see the AuzGuard landing page
3. Choose a role to sign in:
   - **Viewer** - Read-only access
   - **Developer** - Can create and test routes
   - **Compliance** - Can manage policies and audit logs
   - **Admin** - Full access to all features

**Note:** The application uses a simplified authentication system for development. No password is required in development mode.

## Testing the Application

Run the test suite:

```bash
npm test
```

Run tests in watch mode (for development):

```bash
npm run test:watch
```

## Exploring Features

Once logged in, you can:

### 1. Simulator / Chat Playground
- Test AI requests against your policies
- See real-time allow/block decisions
- View routing decisions and traces

### 2. Policy Editor
- Create and edit compliance policies
- Define rules using CEL-like expressions
- Manage rule evaluation strategies

### 3. Audit Logs
- View immutable audit trails
- Verify integrity with Merkle proofs
- Export audit reports

### 4. Routes & Model Pools
- Configure AI model routing
- Set up region-specific pools
- Manage onshore-only routing

## Common Commands Reference

| Command | Description |
|---------|-------------|
| `npm install` | Install all dependencies |
| `npm run dev` | Run both backend and frontend in development |
| `npm run dev:backend` | Run only backend in development |
| `npm run dev:frontend` | Run only frontend in development |
| `npm run build` | Build both backend and frontend for production |
| `npm run build:backend` | Build only backend |
| `npm run build:frontend` | Build only frontend |
| `npm start` | Run production server |
| `npm test` | Run test suite |
| `npx prisma studio` | Open Prisma database GUI |
| `npx prisma generate` | Regenerate Prisma client |
| `npx prisma db push` | Sync database with schema |
| `npx prisma migrate dev` | Create a new migration |

## Troubleshooting

### Database Connection Issues

**Error:** `Can't reach database server`
- Ensure PostgreSQL is running: `pg_ctl status` (Windows) or `sudo service postgresql status` (Linux)
- Verify your `DATABASE_URL` in `.env` has correct credentials
- Check if the database exists: `psql -U postgres -l`

### Port Already in Use

**Error:** `Port 3000 is already in use` or `Port 3001 is already in use`
- Change the port in `.env` (for backend):
  ```env
  PORT=3002
  ```
- For frontend, edit `frontend/vite.config.ts` to use a different port

### Missing Dependencies

**Error:** `Cannot find module...`
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# For frontend
cd frontend
rm -rf node_modules package-lock.json
npm install
cd ..
```

### Prisma Client Not Generated

**Error:** `@prisma/client did not initialize yet`
```bash
npx prisma generate
```

### Build Errors

If you encounter TypeScript compilation errors:
```bash
# Clean and rebuild
rm -rf dist/
npm run build:backend
```

### Frontend Not Loading

- Check browser console for errors
- Ensure backend is running on the correct port
- Verify API endpoint in `frontend/src/api/client.ts`

## Database Management

### View Database with Prisma Studio

Open a visual database editor:
```bash
npx prisma studio
```

This opens a browser-based GUI at `http://localhost:5555` where you can view and edit database records.

### Reset Database

To reset the database to a clean state:
```bash
npx prisma db push --force-reset
```

**Warning:** This will delete all data!

### Create Database Backups

```bash
# Create backup
pg_dump -U postgres auzguard > backup.sql

# Restore from backup
psql -U postgres auzguard < backup.sql
```

## Optional: AI Model Configuration

To use real AI models instead of stub responses:

### OpenAI
1. Get an API key from [OpenAI Platform](https://platform.openai.com/)
2. Add to `.env`: `OPENAI_API_KEY="sk-..."`
3. Set `MODEL_GARDEN_STUB_RESPONSES=false`

### Google Gemini
1. Get an API key from [Google AI Studio](https://makersuite.google.com/)
2. Add to `.env`: `GEMINI_API_KEY="..."`
3. Set `MODEL_GARDEN_STUB_RESPONSES=false`

### Ollama (Local Models)
1. Install [Ollama](https://ollama.ai/)
2. Run: `ollama serve`
3. Verify: `curl http://localhost:11434`
4. Set `MODEL_GARDEN_STUB_RESPONSES=false`

## Project Structure

```
AuzGuard/
├── src/                    # Backend source code
│   ├── server.ts          # Main server entry point
│   ├── routes/            # API route handlers
│   ├── services/          # Business logic
│   └── types/             # TypeScript types
├── frontend/              # Frontend React application
│   ├── src/
│   │   ├── pages/         # React page components
│   │   ├── components/    # Reusable React components
│   │   └── api/           # API client
│   └── dist/              # Built frontend (after npm run build)
├── prisma/                # Database schema and migrations
│   └── schema.prisma
├── dist/                  # Compiled backend (after npm run build)
├── .env                   # Environment variables (create this)
└── package.json           # Dependencies and scripts
```

## Next Steps

After successfully running the application:

1. Review the [README.md](README.md) for feature overview
2. Check [DEPLOYMENT_CHECKLIST.md](DEPLOYMENT_CHECKLIST.md) for production deployment
3. Explore [ENHANCEMENTS.md](ENHANCEMENTS.md) for planned features
4. Read the API documentation in the README

## Support

If you encounter issues not covered in this guide:

1. Check existing GitHub issues
2. Review the logs in the terminal where you ran `npm run dev`
3. Open a new GitHub issue with:
   - Error messages
   - Steps to reproduce
   - Your environment (OS, Node version, PostgreSQL version)

## Quick Start Summary

For experienced developers, here's the TL;DR:

```bash
# Install dependencies
npm install

# Configure environment
cp env.example .env
# Edit .env with your database credentials

# Set up database
npx prisma generate
npx prisma db push

# Run application
npm run dev

# Access at http://localhost:3000
```

---

**Happy coding!** 🚀




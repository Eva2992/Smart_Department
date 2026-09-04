# Smart Department

Smart Department is a comprehensive Academic Operations Platform designed for departmental course management, routine scheduling, batch coordination, academic tracking, continuous assessments, and resource/results distribution for the Department of Computer Science and Engineering (CSE) at Jahangirnagar University (JU).

---

## 🚀 Quick Start (One-Command Launch)

You can launch the complete development environment (both backend API and frontend client) with a single command from the project root:

```bash
npm run dev
```

### What `npm run dev` does automatically:

- **Dependency & Artifact Verification**: Checks if `server` and `client` dependencies are installed and verifies that the Prisma client is generated. If missing, it installs dependencies and generates the Prisma client automatically.
- **Parallel Startup**: Spawns the Express backend (`http://localhost:5000`) and the Vite React frontend (`http://localhost:5173`) concurrently.
- **Unified & Colorized Logging**: Prefixes logs with `[server]` (cyan) and `[client]` (magenta) with timestamps for clear service attribution.
- **Graceful Termination**: Captures termination signals (`Ctrl+C` / `SIGINT` / `SIGTERM`) and cleanly tears down all child process trees without leaving orphan background processes or lingering ports.
- **Fail-Fast Safety**: If either service fails to start or crashes, the orchestrator logs the error clearly and halts sibling processes to prevent half-running states.

---

## 📋 Available Root Scripts

From the repository root, you can run:

| Command                   | Description                                             |
| ------------------------- | ------------------------------------------------------- |
| `npm run dev`             | Start backend & frontend development servers together   |
| `npm run install:all`     | Install all dependencies for both `server` and `client` |
| `npm run build`           | Build both `server` and `client` for production         |
| `npm run test`            | Run test suites across `server` and `client`            |
| `npm run lint`            | Run ESLint on the frontend codebase                     |
| `npm run prisma:generate` | Generate Prisma client and types                        |
| `npm run prisma:migrate`  | Deploy committed migrations to the database             |
| `npm run prisma:push`     | Sync Prisma schema directly with DB (rapid prototyping) |
| `npm run prisma:seed`     | Seed initial database records                           |

---

## 🗄️ Database Setup (Neon PostgreSQL - No Docker Required)

This project connects to serverless PostgreSQL on [Neon](https://neon.tech) without requiring Docker.

### 1. Configure Environment Variables

Copy `.env.example` in `server/` to `server/.env`:

```bash
cp server/.env.example server/.env
```

In your Neon project dashboard:

- **Pooled Connection (`DATABASE_URL`)**: Check the **Connection pooling** toggle. This endpoint includes `-pooler` in the host and is used by Express at runtime.
- **Direct Connection (`DIRECT_URL`)**: Uncheck the **Connection pooling** toggle. This connects directly without PgBouncer and is used by Prisma CLI for migrations.

Example `server/.env`:

```env
DATABASE_URL="postgresql://user:password@ep-xxxx-pooler.region.aws.neon.tech/smart_department?sslmode=require"
DIRECT_URL="postgresql://user:password@ep-xxxx.region.aws.neon.tech/smart_department?sslmode=require"
```

### 2. Initialize Database & Seed

Run from project root:

```bash
# Apply schema migrations to your database
npm run prisma:migrate

# Seed rooms, batches, initial users, and demo schedules
npm run prisma:seed
```

Alternatively, during rapid local feature development you can run:

```bash
npm run prisma:push
```

---

## 🛠️ Tech Stack & Ports

- **Backend (`/server`)**: Node.js, Express 5, TypeScript, Prisma ORM, PostgreSQL (Port `5000`)
- **Frontend (`/client`)**: React 19, Vite, Tailwind CSS v4, TypeScript, React Router (Port `5173`)

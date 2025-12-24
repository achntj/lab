# Personal Lab (Tauri + Next.js)

![Personal Lab home](/public/home.png)

Desktop workspace app built with Tauri, Next.js, Tailwind, shadcn/ui, and SQLite via Prisma. Pages include Home, Tasks, Notes, Timers, Bookmarks, Subscriptions, and a global search modal with configurable hotkeys and command palette. Includes an app lock with PIN/biometric unlock that auto-locks on launch and after a configurable idle timeout.

## Prerequisites

- Node.js 18+ and npm
- Rust toolchain (for Tauri) and required platform dependencies (see [Tauri prerequisites](https://tauri.app/start/prerequisites/)).
- SQLite (bundled with macOS/Linux; no action usually needed).

## Setup

```bash
npm run env:copy     # optional: cp .env.example .env
npm install
npx prisma migrate dev                    # creates prisma/dev.db using existing migrations
npm run db:seed                           # seeds demo data
```

Environment: `.env.example` points `DATABASE_URL` to `file:./dev.db` (relative to `prisma/schema.prisma`). Copy it to `.env` if you need to reset or change the database path.

## Run

- Web dev server: `npm run dev` (http://localhost:3000)
- Desktop shell: `npm run tauri:dev` (starts Next dev server then opens the Tauri window)

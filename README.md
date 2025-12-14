# Personal Lab (Tauri + Next.js)

Local-first desktop workspace built with Tauri, Next.js, Tailwind, shadcn/ui, and SQLite via Prisma. Pages include Home, Tasks, Calendar, Notes, Timers, Bookmarks, Subscriptions, and a global search modal with configurable hotkeys and command palette.

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

Environment: `.env.example` points `DATABASE_URL` to `file:./prisma/dev.db`. Copy it to `.env` if you need to reset or change the database path.

## Run
- Web dev server: `npm run dev` (http://localhost:3000)
- Desktop shell: `npm run tauri:dev` (starts Next dev server then opens the Tauri window)
- Lint: `npm run lint`

## Project Structure
- `src/app` — App Router pages and layout (sidebar + command palette). Includes Bookmarks, Tasks, Notes, Calendar, Timers, Subscriptions (Finances), and Search.
- `src/components` — shadcn/ui components plus layout helpers.
- `prisma/schema.prisma` — SQLite schema; `prisma/seed.ts` seeds demo rows.
- `src-tauri` — Tauri Rust shell configuration and icons.

## Notes
- Command palette is available everywhere with `⌘K` (or `Ctrl+K`); search modal opens with `/` or `⌘⇧F`.
- Sidebar includes quick access to Tasks, Calendar, Notes, Timers, Bookmarks, and Finances.
- Hotkeys: configurable in `Settings` (defaults: mod+k palette, / quick search, mod+shift+space search, mod+shift+m new note, mod+shift+b new task, mod+shift+l theme toggle).
- Prisma client is initialized in `src/lib/prisma.ts` for server components; keep queries server-side to avoid bundling database logic in the client.

## Troubleshooting
- If Prisma engine downloads are blocked, rerun `npm run db:seed` with network access or set `PRISMA_ENGINES_CACHE_DIR` to a writeable path.
- Tauri builds require the Rust toolchain and platform-specific dependencies; see `src-tauri/tauri.conf.json` for build hooks.

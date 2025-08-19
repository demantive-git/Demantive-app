Demantive Monorepo

Monorepo for the Demantive app. Uses pnpm workspaces with Next.js (App Router).

Requirements

- Node 20 LTS
- pnpm 9

Install

```bash
pnpm install
```

Develop

```bash
pnpm dev
```

Build

```bash
pnpm build
```

Environment Variables
Use Vercel Environment Variables for secrets. Mirror locally via `.env.local` (not committed).

Structure

- apps/web — Next.js App Router web app
- packages/\* — shared packages (planned)

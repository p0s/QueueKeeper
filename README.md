# QueueKeeper

QueueKeeper is a private procurement agent for hiring a verified human to scout or hold a place in line with staged escrow, bounded spend, and redacted receipts.

## What the demo shows

- buyer creates a queue job with staged payouts
- bounded permission policy with spend cap / expiry / token / contract restrictions
- mobile-friendly runner job list and active job route
- proof hash timeline for scout / arrival / heartbeat / completion
- planner service with Venice-style adapter boundary
- Self verification boundary with explicit dev-only mock adapter
- minimal staged escrow contract + passing Foundry tests

## Repo layout

- `apps/web` — Next.js buyer + runner UI
- `apps/agent` — Node/TypeScript planner + verification service
- `contracts` — Foundry contracts + tests
- `packages/shared` — shared types and adapter-facing contracts
- `docs` — submission and asset planning docs
- `WEBSITE` — GitHub Pages landing page

## Quick start

### Prerequisites

- Node.js 22+
- pnpm 10+
- Foundry (`forge`, `anvil`)

### Install

```bash
pnpm install
```

### Run web

```bash
pnpm dev:web
```

### Run agent service

```bash
pnpm dev:agent
```

### Validate

```bash
pnpm typecheck
pnpm lint
pnpm build
cd contracts && forge test -vv
```

## Environment

Copy and fill:

- `apps/web/.env.example`
- `apps/agent/.env.example`

No secrets belong in git.

## Screens to capture

See `docs/SCREENSHOT_CHECKLIST.md`.

## Cover image direction

See `docs/COVER_IMAGE_CONCEPT.md`.

## Submission copy

See `docs/SUBMISSION_COPY.md`.

## Integration notes

### MetaMask delegation
The current UI ships a **compatible bounded permission flow** with the same load-bearing fields required for MetaMask delegation:
- spend cap
- expiry
- approved token
- approved contract
- per-job binding

Code comments mark the exact buyer-flow hook where live MetaMask delegation should replace the fallback policy record.

### Venice planner
The planner service accepts hidden buyer fields server-side and returns only a public-safe summary. The provider interface is intentionally swappable so a live Venice client can replace the mock planner without changing web routes.

### Self verification
Runner acceptance goes through a verification adapter. In dev mode the repo uses a mock adapter only behind `SELF_MODE=mock`. The interface is ready for a live Self-backed verifier.

## Remote

```bash
git remote add origin https://github.com/p0s/QueueKeeper/
```

## Alfajores deployment

See `docs/ALFAJORES_DEPLOY.md` for the generated test wallet address, deployment script, and address export flow.

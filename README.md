# QueueKeeper

QueueKeeper is a private procurement agent for hiring a verified human to scout or hold a place in line with staged escrow, bounded spend, and redacted receipts.

## Monorepo layout

- `apps/web` — Next.js buyer + runner UI
- `apps/agent` — Node/TypeScript agent service
- `contracts` — Foundry contracts + tests
- `packages/shared` — shared types and ABI placeholders
- `WEBSITE` — static landing page scaffold

## Quick start

### Prerequisites

- Node.js 22+
- pnpm 10+
- Foundry (`forge`, `anvil`) for contracts

### Install

```bash
pnpm install
```

### Run the web app

```bash
pnpm dev:web
```

### Run the agent service

```bash
pnpm dev:agent
```

### Typecheck

```bash
pnpm typecheck
```

### Lint

```bash
pnpm lint
```

### Contract tests

```bash
cd contracts
forge test
```

## Environment

Copy these examples before running locally:

- `apps/web/.env.example`
- `apps/agent/.env.example`

No secrets belong in git.

## MVP notes

This repo intentionally ships the smallest structure that supports:

- buyer job creation
- mobile-friendly runner route
- staged escrow contract + tests
- shared types for app/agent/contract integration

## Remote

Expected remote:

```bash
git remote add origin https://github.com/p0s/QueueKeeper/
```

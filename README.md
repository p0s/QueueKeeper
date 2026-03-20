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

## Celo Sepolia deployment

See `docs/CELO_SEPOLIA_DEPLOY.md` for the generated test wallet address, deployment script, and address export flow.

## Vercel app deployment

Deploy `apps/web` to Vercel as the public app frontend.

Recommended Vercel project settings:
- Root Directory: `apps/web`
- Install Command: `cd ../.. && pnpm install --frozen-lockfile`
- Build Command: `cd ../.. && pnpm --filter @queuekeeper/web build`

Required env vars for the Vercel project:
- `NEXT_PUBLIC_AGENT_BASE_URL` *(optional; leave blank to use in-app demo API routes)*
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_CELO_CHAIN_ID=11142220`
- `NEXT_PUBLIC_QUEUEKEEPER_ESCROW_ADDRESS=0xb566298bf1c1afa55f0edc514b2f9d990c82f98c`
- `NEXT_PUBLIC_BLOCK_EXPLORER_BASE_URL=https://celo-sepolia.blockscout.com`

If `NEXT_PUBLIC_AGENT_BASE_URL` is blank, the hosted app uses built-in Next.js API routes for planner and runner-accept demo behavior.

## Deployed Celo Sepolia contracts

- Escrow: `0xb566298bf1c1afa55f0edc514b2f9d990c82f98c`
- Delegation policy: `0x8a1e766156d1107b99546c8d84f57f9dffd9bcb3`
- Proof registry: `0xc049de0d689bdf0186407a03708204c9e4199e49`
- Explorer base: `https://celo-sepolia.blockscout.com`



## Live app

- App: `https://web-nu-two-34.vercel.app`
- Contracts: see the deployed Celo Sepolia addresses below.

## Live demo payout

A real staged demo payout was executed on Celo Sepolia using the deployed QueueKeeper escrow.

- Mock stable token: `0xEeA30fA689535f7FB45a8A91045E3b1d1c54A3d6`
- Job creation tx: `0x921f3f8f461679644ce48aad265ba247a8ff313b849b36b409054eee0d5ac14a`
- Runner accept tx: `0x63937ce0fe97ddb716e46f3bf40f60fe5e236406f345d7fc758e4b6b26bc03d7`
- Proof submission tx: `0x6dc5de8167987e646f141b0f4b972a247df219c8bcead641d4bad9b02ac657b7`
- Scout release tx: `0x391524f5123a3e77ec26f732a9239e3abaca6553704f03662f700edb72a01980`
- Explorer: https://celo-sepolia.blockscout.com/tx/0x391524f5123a3e77ec26f732a9239e3abaca6553704f03662f700edb72a01980

# QueueKeeper

QueueKeeper is a hackathon MVP for private queue procurement: a buyer can post a queue-holding job, keep the exact destination private until verified acceptance, pay in stages, and inspect a receipts timeline.

## What is real now

- `apps/web` builds and runs without any external backend by default.
- Blank `NEXT_PUBLIC_AGENT_BASE_URL` falls back to in-app Next.js routes:
  - `/api/planner/decide`
  - `/api/jobs/accept`
- The web app includes a minimal no-DB demo backend with create, list, get, accept, proof submission, and payout release routes.
- Buyer job creation uses a controlled form with validation and a real planner preview based on the current form state.
- Runner list and runner detail pages read real job state from the demo store.
- Exact location stays hidden on public views and is only revealed after verified acceptance through the runner reveal token path.
- Scout, arrival, heartbeat, and completion proof hashes are stored in the demo backend timeline and can be released by the buyer in sequence.
- The frontend can optionally attempt live Celo Sepolia writes through `viem` plus MetaMask for:
  - `createJob`
  - `acceptJob`
  - `submitProofHash`
  - stage release functions
- `packages/shared` exports the real escrow ABI plus the deployed address file used by the frontend.
- Foundry tests pass for the escrow and delegation policy contracts.

## What is still mocked or intentionally limited

- The default demo backend is a simple file-backed store under `/tmp`, not a real multi-user database.
- Venice is mocked unless `VENICE_API_KEY` is provided.
- Venice also needs available provider credits; if the live call fails, the UI and API now surface a `venice-fallback` reason instead of pretending the live planner worked.
- Self verification is mocked unless `SELF_MODE=live` and `SELF_API_URL` are provided.
- In live Self mode, runner accept requires a real `proof`, `publicSignals`, `attestationId`, and `userContextData` payload.
- MetaMask delegation is only marked active if the wallet permission request succeeds; otherwise the UI shows the bounded fallback policy record.
- The current MVP supports a single heartbeat stage, not repeated heartbeat releases.
- `ProofHashRegistry` is deployed but is not wired into the active escrow flow today. The active live write path uses `QueueKeeperEscrow`; the default demo path stores proof hashes in the in-app backend.

## Repo layout

- `apps/web` — Next.js buyer + runner UI plus in-app demo backend
- `apps/agent` — Node/TypeScript planner + verification service
- `contracts` — Foundry contracts + tests
- `packages/shared` — shared types, ABI, and deployed address exports
- `docs` — demo script, submission notes, and asset placeholders
- `WEBSITE` — landing page scaffold

## Quick start

### Prerequisites

- Node.js 22+
- pnpm 10+
- Foundry (`forge`, `anvil`)

### Install

```bash
pnpm install
```

### Run the web app

```bash
pnpm dev:web
```

### Optional agent service

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

Important defaults:

- Leave `NEXT_PUBLIC_AGENT_BASE_URL=` blank to use the built-in demo API routes.
- Set `NEXT_PUBLIC_QUEUEKEEPER_TOKEN_ADDRESS` if you want the optional live `createJob` path to target a different ERC-20 token.
- Set `NEXT_PUBLIC_CELO_RPC_URL` if you want live `viem` reads/writes to use a non-default RPC.
- For a deployed app, add server-side Venice/Self envs in Vercel as well: `VENICE_API_KEY`, `VENICE_MODEL`, `SELF_MODE`, `SELF_API_URL`, `SELF_API_KEY`.

No secrets belong in git.

## Demo backend behavior

- Source of truth for demo state: `apps/web/lib/demo-store.ts`
- Persistence model: local/dev uses in-memory cache plus a file at `/tmp/queuekeeper-demo-store.json`; production/Vercel falls back to in-memory only so hidden job details are not written to disk
- Privacy model: public pages only receive coarse details; runner reveal uses the acceptance response token
- Live planner status: the buyer preview now shows whether the app used `venice-live`, `venice-fallback`, or mock mode
- Live Self status: the runner accept form now switches to the real Self payload fields automatically when `SELF_MODE=live`

## Contracts and addresses

Source of truth for deployed addresses:

- `packages/shared/src/generated/addresses.ts`

Current exported addresses:

- Escrow: `0xb566298bf1c1afa55f0edc514b2f9d990c82f98c`
- Delegation policy: `0x8a1e766156d1107b99546c8d84f57f9dffd9bcb3`
- Proof registry: `0xc049de0d689bdf0186407a03708204c9e4199e49`

## Historical Celo Sepolia example

These historical links are useful for judges, but the local MVP does not depend on them:

- Mock token: `0xEeA30fA689535f7FB45a8A91045E3b1d1c54A3d6`
- Job creation tx: [0x921f3f8f461679644ce48aad265ba247a8ff313b849b36b409054eee0d5ac14a](https://celo-sepolia.blockscout.com/tx/0x921f3f8f461679644ce48aad265ba247a8ff313b849b36b409054eee0d5ac14a)
- Runner accept tx: [0x63937ce0fe97ddb716e46f3bf40f60fe5e236406f345d7fc758e4b6b26bc03d7](https://celo-sepolia.blockscout.com/tx/0x63937ce0fe97ddb716e46f3bf40f60fe5e236406f345d7fc758e4b6b26bc03d7)
- Proof submission tx: [0x6dc5de8167987e646f141b0f4b972a247df219c8bcead641d4bad9b02ac657b7](https://celo-sepolia.blockscout.com/tx/0x6dc5de8167987e646f141b0f4b972a247df219c8bcead641d4bad9b02ac657b7)
- Scout release tx: [0x391524f5123a3e77ec26f732a9239e3abaca6553704f03662f700edb72a01980](https://celo-sepolia.blockscout.com/tx/0x391524f5123a3e77ec26f732a9239e3abaca6553704f03662f700edb72a01980)

## Related docs

- `docs/DEMO-SCRIPT.md`
- `docs/DELIVERY_GAP.md`
- `docs/SUBMISSION_COPY.md`
- `docs/submission-metadata.template.json`

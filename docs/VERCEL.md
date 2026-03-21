# Vercel deployment

QueueKeeper should use **Vercel** for the live app frontend (`apps/web`).

## Why
- the real product frontend is a Next.js app
- Vercel is the lowest-friction deployment path for this repo
- static GitHub Pages is fine for a landing page, but not necessary if the Vercel app is the main demo URL

## Suggested project settings
- Framework Preset: Next.js
- Root Directory: `apps/web`
- Install Command: `cd ../.. && pnpm install --frozen-lockfile`
- Build Command: `cd ../.. && pnpm --filter @queuekeeper/web build`

## Required environment variables
- `NEXT_PUBLIC_AGENT_BASE_URL` *(optional; leave blank to use in-app demo API routes)*
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_CELO_CHAIN_ID=11142220`
- `NEXT_PUBLIC_CELO_RPC_URL=https://forno.celo-sepolia.celo-testnet.org`
- `NEXT_PUBLIC_QUEUEKEEPER_ESCROW_ADDRESS=0xb566298bf1c1afa55f0edc514b2f9d990c82f98c`
- `NEXT_PUBLIC_QUEUEKEEPER_TOKEN_ADDRESS=0xEeA30fA689535f7FB45a8A91045E3b1d1c54A3d6`
- `NEXT_PUBLIC_BLOCK_EXPLORER_BASE_URL=https://celo-sepolia.blockscout.com`
- `VENICE_API_KEY`
- `VENICE_MODEL`
- `SELF_MODE`
- `SELF_API_URL`
- `SELF_API_KEY` *(if required by your Self backend)*

## Demo note
If `NEXT_PUBLIC_AGENT_BASE_URL` is blank, the hosted app uses built-in Next.js API routes for planner and runner-accept behavior plus the in-app demo store routes.

If `SELF_MODE=live`, the runner accept form expects a real Self payload:
- `proof`
- `publicSignals`
- `attestationId`
- `userContextData`

If `VENICE_API_KEY` is present but the Venice account has no available balance, QueueKeeper now falls back transparently and exposes the `venice-fallback` reason in the planner preview instead of silently claiming live planner success.

## Live integration status

- Venice: live-capable server adapter added; activates when `VENICE_API_KEY` is set.
- Self: live-capable verifier adapter added; activates when `SELF_MODE=live` and `SELF_API_URL` is configured.
- MetaMask: live wallet/detection surface and delegation hook points documented in the buyer flow; bounded fallback remains for demo reliability.

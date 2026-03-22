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
- `QUEUEKEEPER_ENCRYPTION_KEY`
- `QUEUEKEEPER_INTERNAL_API_TOKEN`
- `VENICE_API_KEY`
- `VENICE_MODEL`
- `SELF_MODE`
- `SELF_SCOPE`
- `SELF_APP_NAME`
- `SELF_MOCK_PASSPORT`
- `SELF_API_URL`
- `SELF_API_KEY` *(if required by your Self backend)*
- `NEXT_PUBLIC_SELF_APP_NAME`
- `NEXT_PUBLIC_SELF_SCOPE`
- `NEXT_PUBLIC_SELF_ENDPOINT_TYPE=staging_https`

## Demo note
If `NEXT_PUBLIC_AGENT_BASE_URL` is blank, the hosted app uses the built-in Next.js `/api/v1` product API.

If `SELF_MODE=live`, the runner accept path uses a hosted Self verification session and callback endpoint under `/api/v1/self/sessions/...`.

If `VENICE_API_KEY` is present but the Venice account has no available balance, QueueKeeper now falls back transparently and exposes the `venice-fallback` reason in the planner preview instead of silently claiming live planner success.

## Live integration status

- Venice: live-capable planner boundary added; activates when `VENICE_API_KEY` is set.
- Self: live-capable session and callback path added; final hosted verification still needs a full real-device pass.
- MetaMask: live wallet/detection surface and delegation hook points remain in the buyer flow; bounded fallback is still explicit.

## Current live URL

- `https://queuekeeper.xyz`

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
- `NEXT_PUBLIC_AGENT_BASE_URL`
- `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`
- `NEXT_PUBLIC_CELO_CHAIN_ID=11142220`
- `NEXT_PUBLIC_QUEUEKEEPER_ESCROW_ADDRESS=0xb566298bf1c1afa55f0edc514b2f9d990c82f98c`
- `NEXT_PUBLIC_BLOCK_EXPLORER_BASE_URL=https://celo-sepolia.blockscout.com`

## Demo note
If the agent service is not publicly deployed yet, the app still works as a hackathon demo frontend because the buyer/runner flows already support local/mock-backed interactions.

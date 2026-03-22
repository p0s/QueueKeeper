# Delivery gap notes

The repo now ships a more product-like testnet backend loop:

- durable `packages/core` state with SQLite + encrypted object storage
- hosted Next.js app with built-in `/api/v1` product API
- Agent Mode and Human Mode entrypoints
- typed `packages/sdk`
- shared `/v1` API in both `apps/agent` and `apps/web`
- encrypted proof-bundle upload and buyer-side proof review
- repeated heartbeat stages
- timeout auto-release and dispute settlement in backend state
- direct-dispatch and verified-pool modes at the schema/API layer
- live Venice planner path verified on the hosted app
- contracts compile and current Foundry suites pass
- backend lifecycle tests pass in `packages/core`
- legacy compatibility routes that bypassed the `/v1` auth model have been removed
- task command center and sponsor evidence pages now exist in the web app
- root `agent.json` and `agent_log.json` artifacts now ship with the app

The remaining gaps are now specific and visible:

- the hosted state path is still demo-grade and should be hardened further for multi-instance consistency before a real public rollout
- ERC-8004 registration is surfaced in the product, but the app still uses simple env-backed identity display rather than a deeper programmable identity workflow
- `ProofHashRegistry` is deployed but not wired into the active escrow flow
- live Self verification now has hosted session and callback plumbing, but it still needs a final real-device submission recording pass
- MetaMask delegation still depends on browser support and user approval for the true active path
- the Uniswap sidecar now works as a real Sepolia wallet flow, but it still needs a fresh recorded live receipt on the final demo wallet
- the Base/x402 venue-hint sidecar is live, but it still needs a funded Base Sepolia wallet with a small USDC balance to capture the final paid receipt
- the submission package still needs final screenshots, final video URL, and final hosted-flow verification against the exact submission recording setup

These are now completion/polish gaps rather than basic “is there a product loop at all?” gaps.

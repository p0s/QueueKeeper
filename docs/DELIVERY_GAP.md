# Delivery gap notes

The repo now ships a more product-like testnet backend loop:

- durable `packages/core` state with SQLite + encrypted object storage
- typed `packages/sdk`
- shared `/v1` API in both `apps/agent` and `apps/web`
- encrypted proof-bundle upload and buyer-side proof review
- repeated heartbeat stages
- timeout auto-release and dispute settlement in backend state
- direct-dispatch and verified-pool modes at the schema/API layer
- live Venice planner path verified locally
- contracts compile and current Foundry suites pass
- backend lifecycle tests pass in `packages/core`

The remaining gaps are now specific and visible:

- Supabase/Postgres + private object storage adapter for the hosted production path is still not implemented
- `ProofHashRegistry` is deployed but not wired into the active escrow flow
- contract parity for repeated heartbeats, dispute freeze, and timeout auto-release is still incomplete
- live Self frontend verification now has session plumbing, but it still needs a full real-device verification pass on the current hosted deployment
- Vercel still needs the full server-side env set for encryption, Venice, Self, and internal reconcile auth
- MetaMask delegation still depends on browser support and user approval for the true active path
- `queuekeeper.xyz` must be redeployed from the latest `main` before final judging if it is behind
- the submission package still needs final screenshots, cover art, and final hosted-flow verification

These are now completion/polish gaps rather than basic “is there a product loop at all?” gaps.

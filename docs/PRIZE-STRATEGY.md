# Prize strategy

## P0 targets
- Synthesis Open Track
- Protocol Labs / ERC-8004
- Venice
- MetaMask
- Self
- Arkhai
- Celo
- Uniswap
- Base / x402

## Story by sponsor

### Venice
QueueKeeper uses a private planner boundary so hidden task details stay server-side and never leak into public payloads. The hosted app now shows a real `venice-live` vs fallback planner state.

### MetaMask
QueueKeeper binds spend to a task-scoped policy: cap, expiry, token, contract, and delegate. The current repo ships a compatible fallback and clean hook points for live MetaMask delegation.

### Self
QueueKeeper blocks task acceptance until a Self-compatible verification session returns a valid result. The hosted app now uses the session/callback flow and keeps exact destination reveal gated behind acceptance.

### Arkhai
QueueKeeper already uses staged escrow semantics, repeated heartbeat releases, timeout-based release behavior, and dispute handling that map closely to obligation-style flows.

### Celo
QueueKeeper is designed around stablecoin-native micropayments and a mobile-first runner flow.

### Protocol Labs / ERC-8004
QueueKeeper now treats the agent as a first-class product actor with visible identity, structured execution logs, bounded autonomy, and root `agent.json` / `agent_log.json` artifacts.

### Uniswap
QueueKeeper can normalize a planning budget on Ethereum Sepolia before task posting: wrap ETH to WETH, quote WETH -> USDC, sign Permit2, and submit the swap from the browser wallet.

### Base / x402
QueueKeeper exposes a paid venue-hint sidecar on Base Sepolia. The command center can buy one paid signal, write the receipt back into the task log, and let the next planner decision use that hint.

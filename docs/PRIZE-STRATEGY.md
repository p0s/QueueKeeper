# Prize strategy

## P0 targets
- Synthesis Open Track
- Venice
- MetaMask
- Self
- Arkhai
- Celo

## Story by sponsor

### Venice
QueueKeeper uses a private planner boundary so hidden buyer details stay server-side and never leak into public job payloads. The hosted app now shows a real `venice-live` vs fallback planner state.

### MetaMask
QueueKeeper binds spend to a job-scoped policy: cap, expiry, token, contract, and delegate. The current repo ships a compatible fallback and clean hook points for live MetaMask delegation.

### Self
QueueKeeper blocks runner acceptance until a Self-compatible verification session returns a valid result. The hosted app now uses the session/callback flow and keeps exact destination reveal gated behind acceptance.

### Arkhai
QueueKeeper already uses staged escrow semantics, repeated heartbeat releases, timeout-based release behavior, and dispute handling that map closely to obligation-style flows.

### Celo
QueueKeeper is designed around stablecoin-native micropayments and a mobile-first runner flow.

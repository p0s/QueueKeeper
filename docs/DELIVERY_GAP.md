# Delivery gap notes

The repo now ships a truthful, buildable MVP loop:

- buyer form creates or updates a real demo job in the web app
- runner pages read real store state
- exact destination is gated behind verified acceptance
- scout / arrival / heartbeat / completion proofs and releases update the stored timeline
- optional live Celo Sepolia writes are exposed through `viem` + MetaMask
- contracts compile and Foundry tests pass

The remaining gaps are now specific and visible:

- `ProofHashRegistry` is deployed but not wired into the active escrow flow
- only a single heartbeat stage is supported in the current MVP
- the default demo backend is file-backed `/tmp` state, not durable shared storage
- Vercel still needs the Venice and Self server-side env vars configured
- live Venice also needs provider credits; otherwise the app now falls back transparently and shows the fallback reason
- live Self also needs a real proof payload from the Self flow, not placeholder data
- MetaMask delegation success depends on wallet/browser support and user approval
- the submission package still needs final screenshots, cover art, and the actual final demo URL filled in by a human

These are the remaining sponsor-track and polish gaps, not basic product-loop gaps.

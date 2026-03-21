# Demo script

## Goal
Show the full trust loop in under 4 minutes.

## Steps
1. Open homepage and say the one-liner.
2. Open buyer flow and fill the controlled job form.
3. Click planner preview and point out that the result is based on the current form state, while exact destination and notes stay private.
4. Point to the bounded permission policy card: spend cap, expiry, token, contract, and job binding.
5. Fund escrow to create a real demo job in the in-app backend.
6. Open runner jobs on a narrow/mobile viewport and show the redacted list.
7. Open a runner job, point to the verification badge, and accept the job.
8. Call out that exact destination is revealed only after verified acceptance succeeds.
9. Submit scout, arrival, heartbeat, and completion proof hashes.
10. Return to the buyer view and release scout, arrival, heartbeat, and completion in order.
11. End on the receipts timeline: timestamps, proof hashes, stage status, and explorer links.

## If asked about live chain state
- show Foundry tests
- show the shared escrow ABI export and deployed address file
- toggle the optional live write path in the UI if a wallet is available
- show explorer links for escrow, delegation policy, and any captured tx hashes
- note that the current MVP supports one heartbeat stage and that `ProofHashRegistry` is not wired into the active flow yet

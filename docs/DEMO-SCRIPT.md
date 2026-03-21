# Demo script

## Goal
Show the full trust loop in under 4 minutes.

## Steps
1. Open homepage and say the one-liner.
2. Open buyer flow and call out the four-step operations rail: Plan, Fund, Dispatch, Review.
3. Create a `DIRECT_DISPATCH` job with private exact destination, hidden notes, heartbeat count, and heartbeat interval.
4. Run planner preview and call out that the result changes the actual stage plan.
5. Point to the public vs private split and the bounded delegation card.
6. Post the job and note that it now lives in the shared `/v1` durable backend.
7. Open the runner path, show the mobile-first next-action card, start the Self verification session, and keep the exact destination hidden.
8. Accept only after verification succeeds and show reveal data.
9. Submit a scout proof with an encrypted image bundle.
10. Return to the buyer view, review the decrypted proof bundle, and approve the scout stage.
11. Submit arrival and repeated heartbeat proofs and show timeout/dispute state in the timeline.
12. End on explorer links, receipts, and the `/v1` external-agent story.

## If asked about live chain state
- show Foundry tests
- show the shared escrow ABI export and deployed address file
- toggle the optional live write path in the UI if a wallet is available
- show explorer links for escrow, delegation policy, and any captured tx hashes
- explain that the contract now covers repeated heartbeats, disputes, timeout auto-release, and expiry refunds while the backend still handles encrypted proof media and reveal-token privacy

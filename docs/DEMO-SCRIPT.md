# Demo script

## Goal
Show the full trust loop in under 4 minutes.

## Steps
1. Open homepage and say the one-liner.
2. Open buyer flow and create a `DIRECT_DISPATCH` job with private exact destination, hidden notes, heartbeat count, and heartbeat interval.
3. Run planner preview and call out that the result changes the actual stage plan.
4. Point to the public vs private split and the bounded delegation card.
5. Post the job and note that it now lives in the shared `/v1` durable backend.
6. Open the runner path, start the Self verification session, and keep the exact destination hidden.
7. Accept only after verification succeeds and show reveal data.
8. Submit a scout proof with an encrypted image bundle.
9. Return to the buyer view, review the decrypted proof bundle, and approve the scout stage.
10. Submit arrival and repeated heartbeat proofs and show timeout/dispute state in the timeline.
11. End on explorer links, receipts, and the `/v1` external-agent story.

## If asked about live chain state
- show Foundry tests
- show the shared escrow ABI export and deployed address file
- toggle the optional live write path in the UI if a wallet is available
- show explorer links for escrow, delegation policy, and any captured tx hashes
- explain that the backend already models repeated heartbeats, disputes, and timeout auto-release even though the current contract happy path is still simpler

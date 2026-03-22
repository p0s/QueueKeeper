# Submission copy draft

## One liner
QueueKeeper lets a human or agent principal privately procure scarce real-world access one verified micro-step at a time.

## Description
QueueKeeper lets a human or agent principal privately procure scarce real-world access one verified micro-step at a time. Principals pre-fund a task, reveal the destination only after verified acceptance, and pay only for each proof-backed step instead of trusting a stranger with the whole promise up front.

## Problem Statement
Existing platforms for hiring humans in the loop still assume one-shot trust: pay a stranger up front, hope the large promise is fulfilled, and rely on post-hoc review or escrow disputes when reality diverges. That model is structurally wrong for scarce-access scouting and short-lived real-world opportunities where demand is uncertain up front, value arrives incrementally, and each small step is cheaply checkable. Buyers need a private way to buy information first and commitment later; runners need early repeated payment; and agents need explicit spend and reveal boundaries. QueueKeeper exists to replace upfront escrow-first trust with bounded-loss, proof-backed micro-steps.

## Solution
QueueKeeper combines private planning, bounded spend permissions, verified runner gating, staged task payouts, and proof-linked receipts. Principals keep control, runners get paid as they make verifiable progress, and judges can inspect what happened without exposing raw private details.

## What is live in the MVP
- hosted Next.js app with built-in `/api/v1` product API
- Human Mode and Agent Mode task creation flows backed by stored state
- task command center with public/private split, stage ladder, and receipts
- mobile-first runner flow with verification, acceptance, reveal gating, and proof upload
- exact location stays hidden from public task views until verified acceptance succeeds
- scout / arrival / repeated heartbeat / completion proof submission and buyer-side payout controls
- staged escrow contract with repeated heartbeat, timeout, dispute, and refund coverage in the contract test suite
- live Venice planner path on the hosted app, with explicit fallback behavior if the provider is unavailable
- optional wallet-backed live escrow writes through `viem`
- bounded permission policy UI with persisted MetaMask permission results
- root `agent.json` and `agent_log.json` artifacts plus an in-product sponsor evidence page
- env-backed ERC-8004 registration and agent wallet surface in the live app
- Uniswap Sepolia budget normalization sidecar with real WETH -> USDC quote / approval / swap flow
- Base Sepolia x402 venue-hint sidecar that can charge for one paid planning signal and write the receipt back into the task log

## What is still a fallback or mock
- MetaMask delegation falls back to a bounded policy record when the permission request fails or is unavailable
- the hosted product is still demo-grade rather than a production multi-tenant service
- Self live verification still needs a final recorded real-device pass for submission
- `ProofHashRegistry` is deployed but not in the active flow yet
- the Uniswap and x402 sidecars still need fresh demo-wallet receipts captured on the final recording wallet

## Deployed contracts
- Escrow: `0xb566298bf1c1afa55f0edc514b2f9d990c82f98c`
- Delegation policy: `0x8a1e766156d1107b99546c8d84f57f9dffd9bcb3`
- Proof registry: `0xc049de0d689bdf0186407a03708204c9e4199e49`

## Submission links
- Repo: `https://github.com/p0s/QueueKeeper`
- Demo URL: `https://queuekeeper.xyz`
- Video URL: fill in after recording
- Cover image URL: `https://queuekeeper.xyz/opengraph-image`

## Submission-ready files
- API-shaped payload template: `docs/submission-metadata.template.json`
- Submission conversation log: `docs/submission-conversation-log.md`
- Screenshot checklist: `docs/assets/screenshots/README.md`
- Cover asset: `docs/assets/cover/queuekeeper-cover.svg`

## Historical onchain example
- Mock token: `0xEeA30fA689535f7FB45a8A91045E3b1d1c54A3d6`
- Job creation: `https://celo-sepolia.blockscout.com/tx/0x921f3f8f461679644ce48aad265ba247a8ff313b849b36b409054eee0d5ac14a`
- Accept: `https://celo-sepolia.blockscout.com/tx/0x63937ce0fe97ddb716e46f3bf40f60fe5e236406f345d7fc758e4b6b26bc03d7`
- Proof: `https://celo-sepolia.blockscout.com/tx/0x6dc5de8167987e646f141b0f4b972a247df219c8bcead641d4bad9b02ac657b7`
- Scout payout release: `https://celo-sepolia.blockscout.com/tx/0x391524f5123a3e77ec26f732a9239e3abaca6553704f03662f700edb72a01980`

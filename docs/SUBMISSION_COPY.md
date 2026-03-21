# Submission copy draft

## One liner
QueueKeeper lets a buyer privately hire a verified runner to scout or hold a place in line, while staged escrow only releases money as proof hashes and buyer approvals arrive.

## Problem
Real-world errands like queues are awkward for agents: users want help, but they do not want to reveal exact destinations too early, prepay strangers in full, or trust a generic labor platform to enforce staged commitments fairly.

## Solution
QueueKeeper combines private planning, bounded spend permissions, verified runner gating, staged escrow, and proof-hash receipts. Buyers keep control, runners get paid as they make verifiable progress, and judges can inspect what happened without exposing raw private details.

## What is live in the MVP
- self-contained web demo backend with no external DB
- buyer job creation and funding flow backed by real stored state
- mobile-friendly runner list and detail flow backed by real stored state
- verified acceptance gate that hides exact location until accept succeeds
- scout / arrival / heartbeat / completion proof submission and buyer releases
- staged escrow contract + passing Foundry tests
- optional wallet-backed live escrow writes through `viem`
- bounded permission policy UI with persisted MetaMask permission results

## What is still a fallback or mock
- Venice planning is mocked unless `VENICE_API_KEY` is set
- Self verification is mocked unless `SELF_MODE=live` and `SELF_API_URL` are set
- MetaMask delegation falls back to a bounded policy record when the permission request fails or is unavailable
- the current MVP supports one heartbeat stage, not repeated heartbeat payouts
- `ProofHashRegistry` is deployed but not in the active flow yet

## Deployed contracts
- Escrow: `0xb566298bf1c1afa55f0edc514b2f9d990c82f98c`
- Delegation policy: `0x8a1e766156d1107b99546c8d84f57f9dffd9bcb3`
- Proof registry: `0xc049de0d689bdf0186407a03708204c9e4199e49`

## Submission links
- Repo: `https://github.com/p0s/QueueKeeper`
- Demo URL: fill in the final deployed URL before submission
- Video URL: fill in after recording

## Historical onchain example
- Mock token: `0xEeA30fA689535f7FB45a8A91045E3b1d1c54A3d6`
- Job creation: `https://celo-sepolia.blockscout.com/tx/0x921f3f8f461679644ce48aad265ba247a8ff313b849b36b409054eee0d5ac14a`
- Accept: `https://celo-sepolia.blockscout.com/tx/0x63937ce0fe97ddb716e46f3bf40f60fe5e236406f345d7fc758e4b6b26bc03d7`
- Proof: `https://celo-sepolia.blockscout.com/tx/0x6dc5de8167987e646f141b0f4b972a247df219c8bcead641d4bad9b02ac657b7`
- Scout payout release: `https://celo-sepolia.blockscout.com/tx/0x391524f5123a3e77ec26f732a9239e3abaca6553704f03662f700edb72a01980`

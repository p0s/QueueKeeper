# Submission copy draft

## One liner
QueueKeeper lets a user privately hire a verified human to scout and hold a place in line, while their agent pays only as onchain proofs arrive.

## Problem
Real-world errands like queues are awkward for agents: users want help, but they do not want to reveal exact destinations too early, prepay strangers in full, or trust a generic labor platform to enforce staged commitments fairly.

## Solution
QueueKeeper combines private planning, bounded spend permissions, verified runner gating, staged escrow, and proof-hash receipts. Buyers keep control, runners get paid as they make verifiable progress, and judges can inspect what happened without exposing raw private details.

## What is live in the MVP
- buyer job creation flow
- mobile-friendly runner flow
- staged escrow contract + tests
- bounded permission policy UI compatible with MetaMask delegation hooks
- planner service with swappable Venice-style adapter
- Self verification boundary with explicit mock dev adapter


## Deployed contracts
- Escrow: `0xb566298bf1c1afa55f0edc514b2f9d990c82f98c`
- Delegation policy: `0x8a1e766156d1107b99546c8d84f57f9dffd9bcb3`
- Proof registry: `0xc049de0d689bdf0186407a03708204c9e4199e49`


## Live links
- App: `https://web-nu-two-34.vercel.app`
- Repo: `https://github.com/p0s/QueueKeeper`


## Live onchain payout proof
- Mock token: `0xEeA30fA689535f7FB45a8A91045E3b1d1c54A3d6`
- Job creation: `https://celo-sepolia.blockscout.com/tx/0x921f3f8f461679644ce48aad265ba247a8ff313b849b36b409054eee0d5ac14a`
- Accept: `https://celo-sepolia.blockscout.com/tx/0x63937ce0fe97ddb716e46f3bf40f60fe5e236406f345d7fc758e4b6b26bc03d7`
- Proof: `https://celo-sepolia.blockscout.com/tx/0x6dc5de8167987e646f141b0f4b972a247df219c8bcead641d4bad9b02ac657b7`
- Scout payout release: `https://celo-sepolia.blockscout.com/tx/0x391524f5123a3e77ec26f732a9239e3abaca6553704f03662f700edb72a01980`

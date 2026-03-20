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

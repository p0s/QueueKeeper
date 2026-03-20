# TASKS.md

## P0 — ship the demo loop

### T1. Monorepo scaffold
**Goal:** create repo skeleton for app + agent + contracts.

Acceptance:
- Next.js app runs
- Foundry project compiles
- shared package exists
- env examples exist

### T2. Escrow contract
**Goal:** deploy a minimal staged escrow contract.

Acceptance:
- buyer can create funded job
- runner can accept
- stage release functions exist
- refund / expiry path exists
- events emitted for every stage

### T3. Buyer flow
**Goal:** buyer can create and fund a job from UI.

Acceptance:
- form validates
- wallet connect works
- job status page exists
- explorer links visible

### T4. Runner flow
**Goal:** runner can accept job and submit proofs.

Acceptance:
- mobile-friendly view
- job list loads
- accept action works
- submit arrival proof works
- submit heartbeat proof works
- completion flow exists

### T5. Proof timeline
**Goal:** show proof hashes + payout timeline.

Acceptance:
- stage cards render
- timestamps visible
- status updates after tx confirmation

## P1 — privacy

### T6. Private job details
**Goal:** exact location hidden before acceptance.

Acceptance:
- public job card shows coarse area only
- exact location unavailable pre-acceptance
- exact location appears only for accepted runner

### T7. Private planner service
**Goal:** Venice-backed planner decides scout-vs-hold and candidate choice.

Acceptance:
- planner endpoint exists
- hidden fields not exposed in public API response
- planner output logged safely without secrets

## P2 — MetaMask

### T8. Delegation create flow
**Goal:** user creates bounded delegation.

Acceptance:
- spend cap displayed
- expiry displayed
- delegation tx or signature captured
- job can only spend within policy

### T9. Job-specific policy
**Goal:** bind spend permission to job / contract / token.

Acceptance:
- invalid recipient blocked
- overspend blocked
- expired permission blocked

## P3 — Self

### T10. Runner verification
**Goal:** only verified runner can accept.

Acceptance:
- runner verification badge visible
- unverified runner blocked in UI and backend
- acceptance path includes verification reference

## P4 — Arkhai

### T11. Replace or mirror simple escrow with obligation model
**Goal:** add proof-of-presence arbiter semantics.

Acceptance:
- proof type mapped to stage requirement
- release tied to obligation fulfillment
- dispute / return path documented

## P5 — polish

### T12. Landing page
**Goal:** GitHub Pages site that looks real.

Acceptance:
- hero
- how it works
- trust/privacy section
- sponsor stack section
- CTA to demo / repo

### T13. Demo recording path
**Goal:** script and staging data ready.

Acceptance:
- seeded example job
- seeded runner account
- short demo route documented

### T14. Submission assets
**Goal:** ready to submit to Synthesis.

Acceptance:
- project description
- problem statement
- cover image
- screenshots
- conversation log
- submission metadata draft

## Nice-to-have only

### T15. Lit encrypted secret release
### T16. Yield reserve adapter (Lido stretch)
### T17. ENS names / nicer identity cards
### T18. Filecoin-encrypted proof bundle storage

## Kill list

Do not spend hackathon time on:
- full chat system
- reputation marketplace
- generic search
- push notification infrastructure
- advanced dispute UI
- native mobile app
- legal policy engine

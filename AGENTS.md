# AGENTS.md

This repo is built for a hackathon. Optimize for **shipping a crisp working demo**, not architectural purity.

## Mission

Build **QueueKeeper**:
- private queue procurement
- delegated spending
- staged onchain escrow
- verified human runner
- mobile-friendly runner UX
- buyer receipts / audit trail

## Core product rules

1. The user must stay in control.
2. The agent must never have uncapped spend.
3. Sensitive details must remain hidden until necessary.
4. The runner must be paid in stages.
5. The demo must work end-to-end.

## Scope rules

### Always prioritize
- one working buyer flow
- one working runner flow
- one real onchain payout
- one clean receipts timeline

### Deprioritize or skip
- generic marketplace features
- profiles, chats, reviews, referrals
- analytics dashboards
- multi-language support
- fancy animations
- generalized labor platform logic

## Integration rules

### Venice
Use Venice (or Venice-compatible interface) for **private planner / hidden preference reasoning**.
This is not a decorative model swap.
The planner should be the only component that sees:
- exact destination
- hidden max budget
- fallback rules
- whether to scout first or hold immediately

### MetaMask
Delegation must be **load-bearing**.
At minimum:
- spend cap
- expiration
- contract allowlist
- token allowlist

If possible:
- job-specific sub-delegation
- stage-specific permission model

### Self
Identity should be load-bearing:
- only verified runners may accept jobs
- store minimal verification result
- do not over-collect user data

### Arkhai
Escrow / obligation logic should be load-bearing.
If protocol integration is blocked, build a minimal custom escrow with the same conceptual model.

### Celo
Use stablecoin-native payouts on Celo for the core demo.

## Engineering rules

- Prefer a monorepo.
- Prefer simple contracts over clever contracts.
- Use Foundry for contracts and tests.
- Use viem/wagmi for app-chain interactions.
- Use strong typing end-to-end.
- Keep env vars out of the repo.
- Add screenshots / explorer links early.

## UI rules

The UI must show:
- current job stage
- spend cap / delegation summary
- proof timeline
- payout timeline
- what was kept private

The runner UI must work on a phone-sized viewport.

## Security rules

- Never commit secrets.
- Never print private keys in logs.
- Never send credentials to arbitrary domains.
- Never add unnecessary third-party analytics.
- If a feature requires connecting personal accounts, stop and ask whether there is a safer alternative.

## Testing rules

Before saying a task is done:
- run contract tests
- run type checks
- run lint
- click through the buyer flow
- click through the runner flow
- verify at least one happy-path payout locally or on testnet

## Documentation rules

When you finish meaningful work, update:
- README
- demo instructions
- env example
- any ABI / contract addresses
- submission notes if relevant

## Style rules

- Keep code boring and readable.
- Favor explicit names.
- Favor small files.
- Avoid magic numbers.
- Add comments for protocol logic and security assumptions only.

## Definition of done

A task is done only if:
1. the feature works,
2. the UI path exists,
3. the relevant tests pass,
4. the docs mention it,
5. the change helps the final demo.

## Submission conversation log policy

We maintain a curated `CONVERSATION_LOG.md` for Synthesis submission purposes.

Do NOT treat this as a full transcript.
Do NOT dump raw chat logs, chain-of-thought, terminal noise, secrets, tokens, private keys, personal account details, or irrelevant debugging chatter into it.

Only append concise, factual milestone entries that are useful to judges:
- date/time
- human request or decision
- agent action taken
- key pivot / insight / breakthrough
- important docs or tools actually used
- result / artifact produced

Each entry should be 3–8 lines max and grounded in real work visible in the repo, demo, or docs.

If unsure whether something belongs in the submission log, leave it out and add it to private notes instead.

Never automatically submit `CONVERSATION_LOG.md` to the hackathon API.
A human must review and approve the final `conversationLog` text before submission.

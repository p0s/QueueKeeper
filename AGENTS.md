# AGENTS.md

QueueKeeper is a demo-first public repo. Optimize for a crisp working product, not architectural purity.

## Working rules

- Use a hard cutover approach and do not prioritize backward compatibility.
- Keep code boring, explicit, and readable.
- Prefer simple contracts and straightforward app flows over clever abstractions.
- Use strong typing end to end.
- Keep secrets, env vars, and private data out of git and logs.
- Use `SPEC.md` as the current product-alignment document: use it to figure out what to build and stay aligned toward the goal.
- If the human asks for something significantly different from `SPEC.md`, confirm the new direction first, then update `SPEC.md` after that direction is agreed.
- Record important tooling realities in `tooling.md` whenever something materially works, fails, or needs a non-obvious workaround in this environment.
- If an integration is blocked, replace it with the smallest honest implementation that preserves the demo loop.
- Do not spend time on generic marketplace features, growth features, or unrelated dashboards.

## Done means

A task is done only if:
1. the feature works
2. the UI path exists
3. relevant tests pass
4. docs are updated when needed
5. the change improves the final demo

Before calling meaningful work done, run the relevant checks:
- contract tests
- type checks
- lint
- the buyer flow
- the runner flow

## Conversation log

`CONVERSATION_LOG.md` is a curated submission artifact, not a raw transcript.

- Add only concise factual milestones grounded in real repo work.
- Never include secrets, raw logs, private account details, or chain-of-thought.
- A human must review it before any submission.

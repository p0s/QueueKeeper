---
name: queuekeeper-spec-alignment
description: Use when working in the QueueKeeper repo and you need to stay aligned with the repo rules, product spec, active task list, and curated submission log. This skill tells you which documents are authoritative, how to use them, and which files must be updated when product decisions or demo-facing behavior change.
---

# QueueKeeper Spec Alignment

## Overview

Use this skill for feature work, bug fixes, copy changes, submission prep, or repo maintenance inside QueueKeeper when code and docs need to stay aligned.

This is a repo-internal alignment skill. It is not the public machine handoff served by `https://queuekeeper.xyz/skill.md`.

## Authoritative Files

Read these in this order unless the task is extremely narrow:

1. `AGENTS.md`
2. `SPEC.md`
3. `TASKS.md`

Use these as supporting submission artifacts when relevant:

- `CONVERSATION_LOG.md`
- `docs/SUBMISSION_COPY.md`
- `docs/submission-conversation-log.md`
- `docs/submission-metadata.template.json`

File roles:

- `AGENTS.md`: repo operating rules and definition of done
- `SPEC.md`: product source of truth
- `TASKS.md`: active execution checklist and delivery priorities
- `CONVERSATION_LOG.md`: curated factual milestones for submission, not planning scratchpad

## Workflow

### 1. Build Context

- Read `AGENTS.md` first for repo rules.
- Read the relevant sections of `SPEC.md` before changing behavior, copy, flows, or product framing.
- Check `TASKS.md` to understand whether the requested work changes an active delivery priority.

### 2. Stay Aligned While Implementing

- Treat `SPEC.md` as the product contract.
- If implementation behavior changes in a user-visible or demo-visible way, update `SPEC.md` in the same round.
- If priorities, scope, or explicit deliverables change, update `TASKS.md` if it is still being used as the live checklist.

### 3. Update Submission Artifacts Carefully

- Add to `CONVERSATION_LOG.md` only when the work is a real milestone worth preserving for submission.
- Keep entries concise, factual, and grounded in repo work.
- Never use `CONVERSATION_LOG.md` as memory, brainstorming space, or raw transcript storage.

### 4. Resolve Drift

If code, spec, and task docs disagree:

- Prefer the user's latest explicit direction first.
- Then bring `SPEC.md` up to date so the repo has one clear product story.
- Do not leave known code/spec drift behind after changing a flow unless the user explicitly wants the docs deferred.

## Update Rules

Update `SPEC.md` when:

- task or runner flow changes
- API shape or route behavior changes
- privacy or trust boundaries change
- the primary demo story or product framing changes
- an integration moves from mock to real or real to fallback

Update `TASKS.md` when:

- a priority is newly in scope
- a milestone is finished
- the demo-critical path changes

Update `CONVERSATION_LOG.md` when:

- a meaningful milestone is completed
- a human decision materially redirects the product
- a submission-facing artifact or demo path becomes real

## Guardrails

- Do not invent product behavior that is not supported by code or spec.
- Do not treat submission copy as the source of truth when it conflicts with `SPEC.md`.
- Do not add speculative roadmap items to `CONVERSATION_LOG.md`.
- Do not confuse this repo skill with the public `skill.md` endpoint intended for outside agents.

import type { AgentIdentityView } from "@queuekeeper/shared";
import { deployedAddresses } from "@queuekeeper/shared";

export const procurementThesis =
  "Rent a human with bounded trust: pay only for the next verified increment, never for the whole promise.";

export function shortAddress(address?: string | null) {
  if (!address) return "Not configured";
  return `${address.slice(0, 6)}…${address.slice(-4)}`;
}

export function getAgentIdentityManifest(): AgentIdentityView {
  return {
    name: process.env.NEXT_PUBLIC_QUEUEKEEPER_AGENT_NAME ?? "QueueKeeper Planner",
    role: process.env.NEXT_PUBLIC_QUEUEKEEPER_AGENT_ROLE ?? "Private Scout-and-Hold Procurement Agent",
    mode: "AGENT",
    harness: "codex-cli",
    model: process.env.NEXT_PUBLIC_QUEUEKEEPER_AGENT_MODEL ?? "Venice private planner + QueueKeeper control loop",
    walletAddress: process.env.NEXT_PUBLIC_QUEUEKEEPER_AGENT_WALLET ?? process.env.NEXT_PUBLIC_CELO_SEPOLIA_TEST_ADDRESS ?? null,
    ensName: process.env.NEXT_PUBLIC_QUEUEKEEPER_AGENT_ENS ?? null,
    registrationUrl: process.env.NEXT_PUBLIC_SYNTHESIS_AGENT_REGISTRATION_URL ?? null,
    receiptPolicy: procurementThesis,
    spendPolicy: "Bounded by task scope, token, expiry, and stage budget.",
    safetySummary: [
      "The agent can recommend continue, stop, or escalate, but cannot exceed the delegated spend boundary.",
      "Private destination and handoff details stay gated until verified acceptance.",
      "Every released increment leaves receipts, stage state, and explorer links."
    ]
  };
}

export function getStaticAgentJson() {
  return {
    name: process.env.NEXT_PUBLIC_QUEUEKEEPER_AGENT_NAME ?? "QueueKeeper Planner",
    role: process.env.NEXT_PUBLIC_QUEUEKEEPER_AGENT_ROLE ?? "Private Scout-and-Hold Procurement Agent",
    framework: "custom typed task orchestration",
    harness: "codex-cli",
    model: process.env.NEXT_PUBLIC_QUEUEKEEPER_AGENT_MODEL ?? "venice-live-or-fallback",
    walletAddress: process.env.NEXT_PUBLIC_QUEUEKEEPER_AGENT_WALLET ?? process.env.NEXT_PUBLIC_CELO_SEPOLIA_TEST_ADDRESS ?? null,
    ensName: process.env.NEXT_PUBLIC_QUEUEKEEPER_AGENT_ENS ?? null,
    registrationUrl: process.env.NEXT_PUBLIC_SYNTHESIS_AGENT_REGISTRATION_URL ?? null,
    networks: {
      primaryPaymentRail: "Celo Sepolia",
      identityRail: "Base / ERC-8004"
    },
    capabilities: [
      "draft private tasks",
      "reason over hidden constraints",
      "decide continue vs stop vs hold escalation",
      "enforce bounded spend",
      "emit structured receipts"
    ],
    safety: {
      spendBoundary: "token + contract + expiry + task scope",
      revealBoundary: "verified acceptance required",
      receiptPolicy: procurementThesis
    },
    contracts: deployedAddresses
  };
}

export function getStaticAgentLog() {
  return {
    task: "conference-merch-scout-and-hold",
    thesis: procurementThesis,
    steps: [
      {
        phase: "discover",
        summary: "Principal drafted a private scarce-access scouting task.",
        outcome: "Task budget and proof rules established."
      },
      {
        phase: "plan",
        summary: "Private planner evaluated urgency, hidden destination, and budget tolerance.",
        outcome: "Scout-first path selected."
      },
      {
        phase: "verify",
        summary: "Runner completed verification and unlocked reveal access.",
        outcome: "Acceptance gate passed."
      },
      {
        phase: "submit",
        summary: "Scout proof arrived with media and proof hash.",
        outcome: "First increment became payable."
      },
      {
        phase: "decide",
        summary: "Agent recommended continuing into hold coverage rather than aborting.",
        outcome: "Later increments stayed active."
      }
    ]
  };
}

export function getPublicSkillMarkdown(origin = "https://queuekeeper.xyz") {
  const normalizedOrigin = origin.replace(/\/+$/, "");

  return `# QueueKeeper Skill

Use QueueKeeper when a human or agent principal wants to privately procure a verified human to scout, hold, or hand off scarce real-world access one proof-backed step at a time.

## Product thesis

Bound trust to the next verified increment.

QueueKeeper pre-funds task capacity, keeps the exact destination private until verified acceptance, and only releases payment for the next proof-backed step instead of the whole promise.

## Public artifacts

- Agent identity: ${normalizedOrigin}/agent.json
- Agent execution log: ${normalizedOrigin}/agent_log.json
- Task API schema: ${normalizedOrigin}/api/v1/openapi.json
- Sponsor evidence: ${normalizedOrigin}/evidence

## Core API flow

1. Preview the private planner:
\`POST ${normalizedOrigin}/api/v1/planner/preview\`
2. Create a task draft:
\`POST ${normalizedOrigin}/api/v1/tasks/drafts\`
3. Post the task:
\`POST ${normalizedOrigin}/api/v1/tasks/:taskId/post\`
4. Track the task:
\`GET ${normalizedOrigin}/api/v1/tasks/:taskId\`
5. Let the agent decide:
\`POST ${normalizedOrigin}/api/v1/tasks/:taskId/agent/decide\`
6. Read the structured agent log:
\`GET ${normalizedOrigin}/api/v1/tasks/:taskId/agent/log\`

## Minimal discovery commands

\`\`\`bash
curl -s ${normalizedOrigin}/agent.json
curl -s ${normalizedOrigin}/agent_log.json
curl -s ${normalizedOrigin}/api/v1/openapi.json
\`\`\`

## Notes

- Keep buyer tokens and reveal tokens private.
- Only verified runners should accept tasks.
- Exact destination and private instructions remain hidden until acceptance and authorization checks pass.
- Optional sidecars:
  - Uniswap budget normalization
  - Base x402 paid venue hint
`;
}

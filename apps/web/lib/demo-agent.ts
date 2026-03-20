import {
  buildPlannerDecision,
  toPublicPlannerSummary,
  type PlannerDecision,
  type PlannerInput,
  type SelfVerificationResult
} from "@queuekeeper/shared";

export type HiddenPlannerRequest = PlannerInput;

export type AcceptJobRequest = {
  jobId: string;
  runnerAddress: string;
  verificationPayload: {
    reference?: string;
    mockVerified?: boolean;
    proof?: string;
    signal?: string;
  };
};

export async function runPlanner(input: HiddenPlannerRequest) {
  const veniceApiKey = process.env.VENICE_API_KEY;

  if (veniceApiKey) {
    const response = await fetch("https://api.venice.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${veniceApiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: process.env.VENICE_MODEL ?? "venice-uncensored",
        messages: [
          {
            role: "system",
            content:
              "You are QueueKeeper's private planner. Decide exactly one of: scout-only, scout-then-hold, abort. Return JSON with keys action and reason only."
          },
          {
            role: "user",
            content: JSON.stringify({
              urgency: input.urgency,
              scoutFee: input.scoutFee,
              completionBonus: input.completionBonus,
              maxBudget: input.maxBudget,
              hiddenExactLocation: input.hiddenExactLocation,
              hiddenNotes: input.hiddenNotes,
              candidates: input.candidates
            })
          }
        ],
        venice_parameters: {
          include_venice_system_prompt: false
        },
        temperature: 0.2,
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "queuekeeper_planner_decision",
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                action: {
                  type: "string",
                  enum: ["scout-only", "scout-then-hold", "abort"]
                },
                reason: { type: "string" }
              },
              required: ["action", "reason"]
            }
          }
        }
      })
    });

    if (response.ok) {
      const json = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };
      const content = json.choices?.[0]?.message?.content;
      if (content) {
        const parsed = JSON.parse(content) as { action: PlannerDecision["action"]; reason: string };
        return {
          summary: toPublicPlannerSummary({
            action: parsed.action,
            reason: parsed.reason,
            chosenRunner: input.candidates.find((candidate) => candidate.verifiedHuman) ?? input.candidates[0]
          }),
          meta: {
            provider: "venice-live",
            hiddenFieldsPersistedServerSideOnly: ["hiddenExactLocation", "hiddenNotes", "maxBudget"]
          }
        };
      }
    }
  }

  const decision = buildPlannerDecision(input);
  return {
    summary: toPublicPlannerSummary(decision),
    meta: {
      provider: "mock",
      hiddenFieldsPersistedServerSideOnly: ["hiddenExactLocation", "hiddenNotes", "maxBudget"]
    }
  };
}

export async function verifyRunner(payload: AcceptJobRequest["verificationPayload"]): Promise<SelfVerificationResult> {
  if (process.env.SELF_MODE === "live" && process.env.SELF_API_URL) {
    const response = await fetch(process.env.SELF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SELF_API_KEY ? { Authorization: `Bearer ${process.env.SELF_API_KEY}` } : {})
      },
      body: JSON.stringify({
        proof: payload.proof,
        signal: payload.signal,
        reference: payload.reference
      })
    });

    if (response.ok) {
      const json = (await response.json()) as { verified?: boolean; reference?: string };
      return {
        status: json.verified ? "verified" : "blocked",
        provider: "self",
        reference: json.reference ?? payload.reference ?? "self-live-reference"
      };
    }
  }

  if (!payload.mockVerified) {
    return {
      status: "blocked",
      provider: "mock-self",
      reference: payload.reference ?? "mock-self-blocked"
    };
  }

  return {
    status: "verified",
    provider: "mock-self",
    reference: payload.reference ?? "mock-self-verified"
  };
}

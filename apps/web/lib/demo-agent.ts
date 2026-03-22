import {
  type AcceptJobVerificationPayload,
  buildPlannerDecision,
  toPublicPlannerSummary,
  type PlannerDecision,
  type PlannerInput,
  type SelfVerificationResult
} from "@queuekeeper/shared";

export type HiddenPlannerRequest = PlannerInput;
const hiddenPlannerFields = ["hiddenExactLocation", "hiddenNotes", "maxBudget"];

function parseSelfJson<T>(value: unknown): T | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value !== "string") return value as T;
  return JSON.parse(value) as T;
}

function buildPreviewResult(input: HiddenPlannerRequest, provider: string, reason?: string) {
  const decision = buildPlannerDecision(input);
  return {
    summary: toPublicPlannerSummary(decision),
    meta: {
      provider,
      ...(reason ? { reason } : {}),
      hiddenFieldsPersistedServerSideOnly: hiddenPlannerFields
    }
  };
}

export async function runPreviewPlanner(input: HiddenPlannerRequest) {
  return buildPreviewResult(input, "deterministic-preview");
}

export async function runPlanner(input: HiddenPlannerRequest) {
  const veniceApiKey = process.env.VENICE_API_KEY;

  if (veniceApiKey) {
    try {
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

      if (!response.ok) {
        const reason = await response.text();
        throw new Error(`Venice request failed: ${response.status} ${reason}`);
      }

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
            hiddenFieldsPersistedServerSideOnly: hiddenPlannerFields
          }
        };
      }
    } catch (error) {
      return buildPreviewResult(input, "venice-fallback", error instanceof Error ? error.message : String(error));
    }
  }

  return buildPreviewResult(input, "mock");
}

function mockVerificationAllowed() {
  if (String(process.env.QUEUEKEEPER_ALLOW_MOCK_VERIFICATION ?? "").toLowerCase() === "true") {
    return true;
  }
  return process.env.NODE_ENV !== "production" && !process.env.VERCEL;
}

export async function verifyRunner(payload: AcceptJobVerificationPayload): Promise<SelfVerificationResult> {
  if (process.env.SELF_MODE === "live" && process.env.SELF_API_URL) {
    let proof: unknown;
    let publicSignals: string[] | undefined;

    try {
      proof = parseSelfJson(payload.proof);
      publicSignals = parseSelfJson<string[]>(payload.publicSignals);
    } catch (error) {
      return {
        status: "blocked",
        provider: "self",
        reference: payload.reference ?? "self-live-blocked",
        reason: error instanceof Error ? error.message : "Invalid Self payload JSON."
      };
    }

    const attestationId = payload.attestationId === undefined ? undefined : Number(payload.attestationId);

    if (!proof || !publicSignals || !attestationId || !payload.userContextData) {
      return {
        status: "blocked",
        provider: "self",
        reference: payload.reference ?? "self-live-blocked",
        reason: "Self live verification requires proof, publicSignals, attestationId, and userContextData."
      };
    }

    const response = await fetch(process.env.SELF_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(process.env.SELF_API_KEY ? { Authorization: `Bearer ${process.env.SELF_API_KEY}` } : {})
      },
      body: JSON.stringify({
        proof,
        publicSignals,
        attestationId,
        userContextData: payload.userContextData,
        reference: payload.reference
      })
    });

    if (response.ok) {
      const json = (await response.json()) as {
        verified?: boolean;
        result?: boolean;
        status?: string;
        reason?: string;
        message?: string;
        reference?: string;
      };
      const verified = json.verified ?? json.result ?? false;
      return {
        status: verified ? "verified" : "blocked",
        provider: "self",
        reference: json.reference ?? payload.reference ?? "self-live-reference",
        reason: verified ? undefined : (json.reason ?? json.message ?? "Self verification failed")
      };
    }

    const reason = await response.text();
    return {
      status: "blocked",
      provider: "self",
      reference: payload.reference ?? "self-live-blocked",
      reason
    };
  }

  if (!mockVerificationAllowed()) {
    return {
      status: "blocked",
      provider: "mock-self",
      reference: payload.reference ?? "mock-self-disabled",
      reason: "Mock verification is disabled in hosted environments. Configure live Self verification or explicitly opt in for a local demo."
    };
  }

  if (!payload.mockVerified) {
    return {
      status: "blocked",
      provider: "mock-self",
      reference: payload.reference ?? "mock-self-blocked",
      reason: "Mock verification was not approved."
    };
  }

  return {
    status: "verified",
    provider: "mock-self",
    reference: payload.reference ?? "mock-self-verified"
  };
}

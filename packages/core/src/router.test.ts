import test, { afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { PlannerInput } from "@queuekeeper/shared";
import { handleQueueKeeperApi, QueueKeeperCore } from "./index.js";

function createTestCore(name: string) {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), `queuekeeper-router-${name}-`));
  return new QueueKeeperCore({
    dataDir: baseDir,
    databasePath: path.join(baseDir, "queuekeeper.sqlite"),
    objectDir: path.join(baseDir, "objects"),
    encryptionKey: Buffer.alloc(32, 11),
    arbiterToken: "arbiter-token"
  });
}

function installTestCore(name: string) {
  const core = createTestCore(name);
  global.__queuekeeperCoreSingleton = core;
  global.__queuekeeperCoreSingletonPromise = undefined;
  return core;
}

function clearTestCore() {
  global.__queuekeeperCoreSingleton = undefined;
  global.__queuekeeperCoreSingletonPromise = undefined;
}

afterEach(() => {
  clearTestCore();
});

const verify = async () => ({
  status: "verified" as const,
  provider: "mock-self" as const,
  reference: "router-test"
});

test("planner preview accepts task-shaped aliases and selected runner shorthand", async () => {
  installTestCore("planner");

  let plannedInput: PlannerInput | undefined;
  const response = await handleQueueKeeperApi(new Request("https://queuekeeper.test/api/v1/planner/preview", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      scoutFeeUsd: "4",
      arrivalFeeUsd: "6",
      heartbeatFeeUsd: "5",
      completionFeeUsd: "20",
      maxSpendUsd: "35",
      exactLocation: "North entrance merch line",
      hiddenNotes: "Scout first.",
      privateFallbackInstructions: "Abort if the line wraps.",
      expiresAt: new Date(Date.now() + 90 * 60_000).toISOString(),
      mode: "DIRECT_DISPATCH",
      selectedRunnerAddress: "0xa11ce0000000000000000000000000000000001"
    })
  }), {
    plan: async (input) => {
      plannedInput = input;
      return {
        summary: {
          action: "scout-then-hold",
          reason: "Test planner result.",
          selectedRunnerAddress: input.candidates[0]?.address
        },
        meta: {
          provider: "test"
        }
      };
    },
    verify
  });

  assert.equal(response.status, 200);
  assert.equal(plannedInput?.urgency, "medium");
  assert.equal(plannedInput?.maxBudget, 35);
  assert.equal(plannedInput?.completionBonus, 20);
  assert.equal(plannedInput?.candidates[0]?.address, "0xa11ce0000000000000000000000000000000001");
  assert.equal(plannedInput?.candidates[0]?.verifiedHuman, true);
});

test("planner preview returns a clear validation error when no runner candidates are supplied", async () => {
  installTestCore("planner-error");

  const response = await handleQueueKeeperApi(new Request("https://queuekeeper.test/api/v1/planner/preview", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      scoutFee: 4,
      completionBonus: 20,
      maxBudget: 35,
      hiddenExactLocation: "North entrance merch line"
    })
  }), {
    plan: async () => {
      throw new Error("Planner should not run on invalid input.");
    },
    verify
  });

  assert.equal(response.status, 400);
  const json = await response.json() as { error: { message: string } };
  assert.equal(json.error.message, "Planner preview requires a candidates array or selectedRunnerAddress.");
});

test("planner preview applies the low default payout ladder when omitted", async () => {
  installTestCore("planner-defaults");

  let plannedInput: PlannerInput | undefined;
  const response = await handleQueueKeeperApi(new Request("https://queuekeeper.test/api/v1/planner/preview", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      hiddenExactLocation: "North entrance merch line",
      selectedRunnerAddress: "0xa11ce0000000000000000000000000000000001"
    })
  }), {
    plan: async (input) => {
      plannedInput = input;
      return {
        summary: {
          action: "scout-only",
          reason: "Default ladder test.",
          selectedRunnerAddress: input.candidates[0]?.address
        },
        meta: {
          provider: "test"
        }
      };
    },
    verify
  });

  assert.equal(response.status, 200);
  assert.equal(plannedInput?.scoutFee, 1);
  assert.equal(plannedInput?.arrivalFee, 1);
  assert.equal(plannedInput?.heartbeatFee, 1);
  assert.equal(plannedInput?.completionBonus, 2);
  assert.equal(plannedInput?.maxBudget, 5);
});

test("task draft accepts expiresAt and numeric strings", async () => {
  installTestCore("draft");

  const response = await handleQueueKeeperApi(new Request("https://queuekeeper.test/api/v1/tasks/drafts", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      mode: "DIRECT_DISPATCH",
      principalMode: "AGENT",
      title: "Agent-created task",
      coarseArea: "Moscone West / Howard St",
      timingWindow: "This afternoon",
      exactLocation: "North entrance merch line",
      hiddenNotes: "Scout first.",
      privateFallbackInstructions: "Abort if the line wraps.",
      maxSpendUsd: "35",
      scoutFeeUsd: "4",
      arrivalFeeUsd: "6",
      heartbeatFeeUsd: "5",
      completionFeeUsd: "20",
      heartbeatCount: "3",
      heartbeatIntervalSeconds: "300",
      expiresAt: new Date(Date.now() + 2 * 60 * 60_000).toISOString(),
      selectedRunnerAddress: "0xa11ce0000000000000000000000000000000001",
      plannerPreview: {
        action: "scout-then-hold",
        reason: "Preview already computed.",
        selectedRunnerAddress: "0xa11ce0000000000000000000000000000000001"
      }
    })
  }), {
    plan: async () => {
      throw new Error("Planner should not run when plannerPreview is provided.");
    },
    verify
  });

  assert.equal(response.status, 200);
  const json = await response.json() as { buyerToken: string; job: { title: string; expiresAt: string } };
  assert.equal(json.job.title, "Agent-created task");
  assert.ok(json.buyerToken);
  assert.ok(Number.isFinite(Date.parse(json.job.expiresAt)));
});

test("task draft applies the low default payout ladder when omitted", async () => {
  installTestCore("draft-defaults");

  const response = await handleQueueKeeperApi(new Request("https://queuekeeper.test/api/v1/tasks/drafts", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      mode: "VERIFIED_POOL",
      principalMode: "AGENT",
      title: "Agent-created defaulted task",
      coarseArea: "Moscone West / Howard St",
      exactLocation: "North entrance merch line",
      hiddenNotes: "Scout first.",
      expiresInMinutes: 60
    })
  }), {
    plan: async () => {
      throw new Error("Planner should not run when the request only creates a draft.");
    },
    verify
  });

  assert.equal(response.status, 200);
  const json = await response.json() as {
    job: {
      maxSpend: string;
      stages: Array<{ key: string; amount?: string }>;
    };
  };
  assert.equal(json.job.maxSpend, "5.00 cUSD");
  assert.equal(json.job.stages.find((stage) => stage.key === "scout")?.amount, "1.00 cUSD");
  assert.equal(json.job.stages.find((stage) => stage.key === "arrival")?.amount, "1.00 cUSD");
  assert.equal(json.job.stages.find((stage) => stage.key === "heartbeat")?.amount, "1.00 cUSD");
  assert.equal(json.job.stages.find((stage) => stage.key === "completion")?.amount, "2.00 cUSD");
});

test("task draft infers VERIFIED_POOL when no mode and no selected runner are supplied", async () => {
  installTestCore("draft-infers-pool");

  const response = await handleQueueKeeperApi(new Request("https://queuekeeper.test/api/v1/tasks/drafts", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      principalMode: "AGENT",
      title: "Pool inference",
      coarseArea: "Seattle / Pike St",
      exactLocation: "Starbucks, 1124 Pike St, Seattle, WA 98101",
      hiddenNotes: "Scout first.",
      expiresInMinutes: 60
    })
  }), {
    plan: async () => {
      throw new Error("Planner should not run during draft creation.");
    },
    verify
  });

  assert.equal(response.status, 200);
  const json = await response.json() as { job: { mode?: string; publicListingStatus?: string } };
  assert.equal(json.job.mode, "VERIFIED_POOL");
  assert.equal(json.job.publicListingStatus, "hidden");
});

test("task draft rejects DIRECT_DISPATCH when selected runner is missing", async () => {
  installTestCore("draft-dispatch-requires-runner");

  const response = await handleQueueKeeperApi(new Request("https://queuekeeper.test/api/v1/tasks/drafts", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      mode: "DIRECT_DISPATCH",
      principalMode: "AGENT",
      title: "Dispatch without runner",
      coarseArea: "Seattle / Pike St",
      exactLocation: "Starbucks, 1124 Pike St, Seattle, WA 98101",
      hiddenNotes: "Scout first.",
      expiresInMinutes: 60
    })
  }), {
    plan: async () => {
      throw new Error("Planner should not run during invalid draft creation.");
    },
    verify
  });

  assert.equal(response.status, 400);
  const json = await response.json() as { error: { message: string } };
  assert.equal(json.error.message, "selectedRunnerAddress is required for DIRECT_DISPATCH. Use VERIFIED_POOL for a public board listing.");
});

test("post task accepts a completely empty body", async () => {
  installTestCore("post-empty-body");

  const draftResponse = await handleQueueKeeperApi(new Request("https://queuekeeper.test/api/v1/tasks/drafts", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      mode: "VERIFIED_POOL",
      principalMode: "AGENT",
      title: "Post empty body",
      coarseArea: "Seattle / Pike St",
      exactLocation: "Starbucks, 1124 Pike St, Seattle, WA 98101",
      hiddenNotes: "Scout first.",
      expiresInMinutes: 60
    })
  }), {
    plan: async () => {
      throw new Error("Planner should not run during draft creation.");
    },
    verify
  });

  const draft = await draftResponse.json() as { buyerToken: string; job: { id: string } };
  const postResponse = await handleQueueKeeperApi(new Request(`https://queuekeeper.test/api/v1/tasks/${draft.job.id}/post`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${draft.buyerToken}`
    }
  }), {
    plan: async () => {
      throw new Error("Planner should not run during post.");
    },
    verify
  });

  assert.equal(postResponse.status, 200);
  const posted = await postResponse.json() as { job: { status: string } };
  assert.equal(posted.job.status, "posted");
});

test("openapi advertises the externally reachable /api/v1 server base", async () => {
  installTestCore("openapi");

  const response = await handleQueueKeeperApi(new Request("https://queuekeeper.xyz/api/v1/openapi.json", {
    method: "GET"
  }), {
    plan: async () => ({
      summary: {
        action: "scout-only",
        reason: "unused"
      }
    }),
    verify
  });

  assert.equal(response.status, 200);
  const json = await response.json() as { servers?: Array<{ url?: string }> };
  assert.equal(json.servers?.[0]?.url, "https://queuekeeper.xyz/api/v1");
});

test("verified self sessions cannot be replayed for a different runner address", async () => {
  const core = installTestCore("runner-binding");
  const draft = core.createTaskDraft({
    mode: "VERIFIED_POOL",
    title: "Runner binding",
    coarseArea: "Moscone South",
    timingWindow: "Today",
    exactLocation: "South entrance line",
    hiddenNotes: "Hold only if short",
    maxSpendUsd: 30,
    scoutFeeUsd: 4,
    arrivalFeeUsd: 6,
    heartbeatFeeUsd: 5,
    completionFeeUsd: 15,
    expiresInMinutes: 60
  });
  core.postTask({ jobId: draft.job.id, buyerToken: draft.buyerToken });

  const session = core.createSelfVerificationSession(
    draft.job.id,
    "0xa11ce0000000000000000000000000000000001",
    "https://queuekeeper.test"
  );
  core.completeSelfVerificationSession(session.sessionId, { verified: true });

  const response = await handleQueueKeeperApi(new Request(`https://queuekeeper.test/api/v1/tasks/${draft.job.id}/accept`, {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      runnerAddress: "0xb0b0000000000000000000000000000000000002",
      verificationPayload: {
        sessionId: session.sessionId
      }
    })
  }), {
    plan: async () => ({
      summary: {
        action: "scout-only",
        reason: "unused"
      }
    }),
    verify
  });

  assert.equal(response.status, 403);
  const json = await response.json() as {
    accepted: boolean;
    reason: string;
  };
  assert.equal(json.accepted, false);
  assert.equal(json.reason, "Verification session belongs to another runner.");
});

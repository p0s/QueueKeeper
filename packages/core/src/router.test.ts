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

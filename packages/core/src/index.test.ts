import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { QueueKeeperCore } from "./index.js";

function createTestCore(name: string) {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), `queuekeeper-core-${name}-`));
  return new QueueKeeperCore({
    dataDir: baseDir,
    databasePath: path.join(baseDir, "queuekeeper.sqlite"),
    objectDir: path.join(baseDir, "objects"),
    encryptionKey: Buffer.alloc(32, 7),
    arbiterToken: "arbiter-token"
  });
}

function createDraft(core: QueueKeeperCore, overrides: Partial<Parameters<QueueKeeperCore["createJobDraft"]>[0]> = {}) {
  return core.createJobDraft({
    mode: "DIRECT_DISPATCH",
    title: "Test queue job",
    coarseArea: "Moscone South",
    timingWindow: "Today",
    exactLocation: "South entrance line",
    hiddenNotes: "Hold only if short",
    privateFallbackInstructions: "Abort if line wraps",
    maxSpendUsd: 30,
    scoutFeeUsd: 4,
    arrivalFeeUsd: 6,
    heartbeatFeeUsd: 5,
    completionFeeUsd: 15,
    expiresInMinutes: 60,
    heartbeatCount: 2,
    heartbeatIntervalSeconds: 120,
    buyerAddress: "0xb0b0000000000000000000000000000000000001",
    selectedRunnerAddress: "0xa11ce0000000000000000000000000000000001",
    plannerAction: "scout-then-hold",
    plannerReason: "test plan",
    plannerProvider: "test",
    ...overrides
  });
}

test("happy path accepts, reveals, and approves stages", () => {
  const core = createTestCore("happy");
  const draft = createDraft(core);
  const posted = core.postJob({ jobId: draft.job.id, buyerToken: draft.buyerToken });
  assert.equal(posted.job.status, "posted");

  const accepted = core.acceptJob(draft.job.id, "0xa11ce0000000000000000000000000000000001", {
    status: "verified",
    provider: "self",
    reference: "self-ref"
  });
  assert.equal(accepted.job.acceptedRunnerAddress, "0xa11ce0000000000000000000000000000000001");
  assert.equal(core.getRevealData(draft.job.id, accepted.acceptanceRecord.revealToken).exactLocation, "South entrance line");

  const scoutStage = accepted.job.stages.find((stage) => stage.key === "scout");
  assert.ok(scoutStage?.stageId);

  const proofed = core.submitProof(draft.job.id, accepted.acceptanceRecord.revealToken, {
    stageId: scoutStage.stageId,
    stageKey: "scout",
    proofHash: "0xscoutproof",
    note: "Scout image sent"
  });
  assert.equal(proofed.job.stages.find((stage) => stage.stageId === scoutStage.stageId)?.status, "submitted");

  const approved = core.approveStage(draft.job.id, {
    buyerToken: draft.buyerToken,
    stageId: scoutStage.stageId
  });
  assert.equal(approved.job.stages.find((stage) => stage.stageId === scoutStage.stageId)?.status, "approved");
});

test("creates repeated heartbeat stages", () => {
  const core = createTestCore("heartbeats");
  const draft = createDraft(core, { heartbeatCount: 3, plannerAction: "hold-now", scoutFeeUsd: 0 });
  const job = core.getTimeline(draft.job.id, "buyer", { buyerToken: draft.buyerToken }).job;
  const heartbeats = job.stages.filter((stage) => stage.key === "heartbeat");
  assert.equal(heartbeats.length, 3);
  assert.deepEqual(heartbeats.map((stage) => stage.sequence), [1, 2, 3]);
});

test("auto releases a submitted stage after timeout", () => {
  const core = createTestCore("autorelease");
  const draft = createDraft(core);
  core.postJob({ jobId: draft.job.id, buyerToken: draft.buyerToken });
  const accepted = core.acceptJob(draft.job.id, "0xa11ce0000000000000000000000000000000001", {
    status: "verified",
    provider: "self",
    reference: "self-ref"
  });
  const scoutStage = accepted.job.stages.find((stage) => stage.key === "scout");
  assert.ok(scoutStage?.stageId);

  core.submitProof(draft.job.id, accepted.acceptanceRecord.revealToken, {
    stageId: scoutStage.stageId,
    stageKey: "scout",
    proofHash: "0xauto"
  });
  core.db.prepare("UPDATE stages SET auto_release_at = ?2 WHERE id = ?1").run(scoutStage.stageId, new Date(Date.now() - 1_000).toISOString());
  const timeline = core.getTimeline(draft.job.id, "buyer", { buyerToken: draft.buyerToken });
  assert.equal(timeline.job.stages.find((stage) => stage.stageId === scoutStage.stageId)?.status, "auto-released");
});

test("dispute freezes the job and requires settlement", () => {
  const core = createTestCore("dispute");
  const draft = createDraft(core);
  core.postJob({ jobId: draft.job.id, buyerToken: draft.buyerToken });
  const accepted = core.acceptJob(draft.job.id, "0xa11ce0000000000000000000000000000000001", {
    status: "verified",
    provider: "self",
    reference: "self-ref"
  });
  const scoutStage = accepted.job.stages.find((stage) => stage.key === "scout");
  assert.ok(scoutStage?.stageId);
  core.submitProof(draft.job.id, accepted.acceptanceRecord.revealToken, {
    stageId: scoutStage.stageId,
    stageKey: "scout",
    proofHash: "0xdispute"
  });

  const disputed = core.disputeStage(draft.job.id, {
    buyerToken: draft.buyerToken,
    stageId: scoutStage.stageId,
    reason: "Bad proof"
  });
  assert.equal(disputed.job.disputeStatus, "open");
  assert.equal(disputed.job.status, "disputed");

  const settled = core.settleDispute(draft.job.id, {
    arbiterToken: "arbiter-token",
    stageId: scoutStage.stageId,
    resolution: "refund-buyer"
  });
  assert.equal(settled.job.disputeStatus, "settled");
  assert.equal(settled.job.stages.find((stage) => stage.stageId === scoutStage.stageId)?.status, "refunded");
});

test("expired job refunds unreleased stages", () => {
  const core = createTestCore("expiry");
  const draft = createDraft(core);
  core.postJob({ jobId: draft.job.id, buyerToken: draft.buyerToken });
  core.db.prepare("UPDATE jobs SET expires_at = ?2 WHERE id = ?1").run(draft.job.id, new Date(Date.now() - 1_000).toISOString());
  const timeline = core.getTimeline(draft.job.id, "buyer", { buyerToken: draft.buyerToken });
  assert.equal(timeline.job.status, "refunded");
  assert.ok(timeline.job.stages.every((stage) => stage.status === "refunded" || stage.status === "pending-proof"));
});

test("public view never reveals exact location before acceptance", () => {
  const core = createTestCore("privacy");
  const draft = createDraft(core);
  const publicJob = core.getJob(draft.job.id, "public");
  assert.equal(publicJob.exactLocationVisibleToViewer, null);
  assert.match(publicJob.exactLocationHint ?? "", /encrypted|revealed/i);
  assert.throws(() => core.getRevealData(draft.job.id, "bad-token"));
});

test("self session polling requires the session access token", () => {
  const core = createTestCore("self-session");
  const draft = createDraft(core);
  core.postJob({ jobId: draft.job.id, buyerToken: draft.buyerToken });

  const session = core.createSelfVerificationSession(
    draft.job.id,
    "0xa11ce0000000000000000000000000000000001",
    "https://queuekeeper.test"
  );

  assert.ok(session.accessToken);
  assert.equal(
    core.getSelfVerificationSession(session.sessionId, session.accessToken ?? "").sessionId,
    session.sessionId
  );
  assert.throws(
    () => core.getSelfVerificationSession(session.sessionId, "wrong-token"),
    /Valid session access token required/
  );
});

test("submitProof rejects stage ids from another job", () => {
  const core = createTestCore("cross-job-submit");
  const victim = createDraft(core, {
    title: "Victim job",
    selectedRunnerAddress: "0xa11ce0000000000000000000000000000000001"
  });
  const attacker = createDraft(core, {
    title: "Attacker job",
    selectedRunnerAddress: "0xb0b0000000000000000000000000000000000002"
  });

  core.postJob({ jobId: victim.job.id, buyerToken: victim.buyerToken });
  core.postJob({ jobId: attacker.job.id, buyerToken: attacker.buyerToken });

  const accepted = core.acceptJob(attacker.job.id, "0xb0b0000000000000000000000000000000000002", {
    status: "verified",
    provider: "self",
    reference: "cross-job-submit"
  });
  const victimScoutStageId = core.getJob(victim.job.id, "buyer", {
    buyerToken: victim.buyerToken
  }).stages.find((stage) => stage.key === "scout")?.stageId;

  assert.ok(victimScoutStageId);
  assert.throws(
    () => core.submitProof(attacker.job.id, accepted.acceptanceRecord.revealToken, {
      stageId: victimScoutStageId,
      stageKey: "scout",
      proofHash: "0xattacker-proof"
    }),
    /Stage not found for job/
  );
});

test("getProofBundle rejects stage ids from another job", () => {
  const core = createTestCore("cross-job-bundle");
  const victim = createDraft(core, {
    title: "Victim bundle",
    selectedRunnerAddress: "0xa11ce0000000000000000000000000000000001"
  });
  const attacker = createDraft(core, {
    title: "Attacker bundle",
    selectedRunnerAddress: "0xb0b0000000000000000000000000000000000002"
  });

  core.postJob({ jobId: victim.job.id, buyerToken: victim.buyerToken });
  core.postJob({ jobId: attacker.job.id, buyerToken: attacker.buyerToken });

  const accepted = core.acceptJob(victim.job.id, "0xa11ce0000000000000000000000000000000001", {
    status: "verified",
    provider: "self",
    reference: "cross-job-bundle"
  });
  const victimScoutStageId = core.getJob(victim.job.id, "buyer", {
    buyerToken: victim.buyerToken
  }).stages.find((stage) => stage.key === "scout")?.stageId;

  assert.ok(victimScoutStageId);
  core.submitProof(victim.job.id, accepted.acceptanceRecord.revealToken, {
    stageId: victimScoutStageId,
    stageKey: "scout",
    proofHash: "0xvictim-proof",
    note: "Victim proof bundle"
  });

  assert.throws(
    () => core.getProofBundle(attacker.job.id, victimScoutStageId, {
      buyerToken: attacker.buyerToken
    }),
    /Stage not found for job/
  );
});

test("public direct-dispatch view hides runner assignment", () => {
  const core = createTestCore("dispatch-redaction");
  const draft = createDraft(core, {
    mode: "DIRECT_DISPATCH",
    selectedRunnerAddress: "0xa11ce0000000000000000000000000000000001"
  });
  core.postJob({ jobId: draft.job.id, buyerToken: draft.buyerToken });

  const publicJob = core.getJob(draft.job.id, "public");
  assert.equal(publicJob.selectedRunnerAddress, undefined);
  assert.equal(publicJob.acceptedRunnerAddress, undefined);
  assert.equal(publicJob.plannerPreview?.selectedRunnerAddress, undefined);
});

test("idempotent draft creation returns the same job", () => {
  const core = createTestCore("idempotent");
  const first = createDraft(core, { title: "Idempotent" });
  const second = core.createJobDraft({
    mode: "DIRECT_DISPATCH",
    title: "Idempotent",
    coarseArea: "Moscone South",
    exactLocation: "South entrance line",
    hiddenNotes: "Hold",
    maxSpendUsd: 30,
    scoutFeeUsd: 4,
    arrivalFeeUsd: 6,
    heartbeatFeeUsd: 5,
    completionFeeUsd: 15,
    expiresInMinutes: 60
  }, "same-key");
  const third = core.createJobDraft({
    mode: "DIRECT_DISPATCH",
    title: "Idempotent",
    coarseArea: "Moscone South",
    exactLocation: "South entrance line",
    hiddenNotes: "Hold",
    maxSpendUsd: 30,
    scoutFeeUsd: 4,
    arrivalFeeUsd: 6,
    heartbeatFeeUsd: 5,
    completionFeeUsd: 15,
    expiresInMinutes: 60
  }, "same-key");
  assert.notEqual(first.job.id, second.job.id);
  assert.equal(second.job.id, third.job.id);
});

test("public list exposes all posted unaccepted jobs", () => {
  const core = createTestCore("pool");
  const direct = createDraft(core, { mode: "DIRECT_DISPATCH", title: "Direct only" });
  core.postJob({ jobId: direct.job.id, buyerToken: direct.buyerToken });

  const pool = createDraft(core, {
    mode: "VERIFIED_POOL",
    title: "Pool listing",
    selectedRunnerAddress: undefined,
    plannerAction: "scout-only"
  });
  core.postJob({ jobId: pool.job.id, buyerToken: pool.buyerToken });

  const publicJobs = core.listJobs("public").jobs;
  assert.ok(publicJobs.some((job) => job.title === "Pool listing"));
  assert.ok(publicJobs.some((job) => job.title === "Direct only"));
});

test("posted direct dispatch tasks can be accepted by another verified runner", () => {
  const core = createTestCore("dispatch-open");
  const draft = createDraft(core, {
    title: "Dispatch stays public"
  });
  core.postJob({ jobId: draft.job.id, buyerToken: draft.buyerToken });

  const accepted = core.acceptJob(draft.job.id, "0xb0b0000000000000000000000000000000000002", {
    status: "verified",
    provider: "self",
    reference: "dispatch-open-ref"
  });

  assert.equal(accepted.job.acceptedRunnerAddress, "0xb0b0000000000000000000000000000000000002");
});

test("public list excludes tasks that reconcile into refunded state", () => {
  const core = createTestCore("public-reconcile");
  const draft = createDraft(core, { mode: "VERIFIED_POOL", title: "Expires before listing" });
  core.postJob({ jobId: draft.job.id, buyerToken: draft.buyerToken });
  core.db.prepare("UPDATE jobs SET expires_at = ?2 WHERE id = ?1").run(draft.job.id, new Date(Date.now() - 1_000).toISOString());

  const publicJobs = core.listJobs("public").jobs;
  assert.ok(!publicJobs.some((job) => job.id === draft.job.id));
});

test("public task projection mirrors post and accept visibility", () => {
  const core = createTestCore("public-projection");
  const draft = createDraft(core, {
    mode: "VERIFIED_POOL",
    title: "Projection listing",
    selectedRunnerAddress: undefined
  });

  assert.equal(core.listJobs("public").jobs.some((job) => job.id === draft.job.id), false);

  core.postJob({ jobId: draft.job.id, buyerToken: draft.buyerToken });
  assert.equal(core.listJobs("public").jobs.some((job) => job.id === draft.job.id), true);

  core.acceptJob(draft.job.id, "0xa11ce00000000000000000000000000000000001", {
    status: "verified",
    provider: "self",
    reference: "projection-ref"
  });
  assert.equal(core.listJobs("public").jobs.some((job) => job.id === draft.job.id), false);
});

test("seed restores one visible verified-pool job when none remain public", () => {
  const baseDir = fs.mkdtempSync(path.join(os.tmpdir(), "queuekeeper-core-seeded-visible-"));
  const options = {
    dataDir: baseDir,
    databasePath: path.join(baseDir, "queuekeeper.sqlite"),
    objectDir: path.join(baseDir, "objects"),
    encryptionKey: Buffer.alloc(32, 7),
    arbiterToken: "arbiter-token"
  } as const;

  const firstCore = new QueueKeeperCore(options);
  const seededPool = firstCore.listJobs("public").jobs.find((job) => job.mode === "VERIFIED_POOL");
  assert.ok(seededPool);

  firstCore.acceptJob(seededPool.id, "0xa11ce0000000000000000000000000000000001", {
    status: "verified",
    provider: "self",
    reference: "self-seed-ref"
  });
  assert.equal(firstCore.listJobs("public").jobs.filter((job) => job.mode === "VERIFIED_POOL").length, 0);

  const restartedCore = new QueueKeeperCore(options);
  assert.ok(restartedCore.listJobs("public").jobs.some((job) => job.mode === "VERIFIED_POOL"));
});

test("task aliases expose the same core state", () => {
  const core = createTestCore("tasks");
  const draft = createDraft(core, { principalMode: "AGENT" });
  core.postTask({ jobId: draft.job.id, buyerToken: draft.buyerToken });
  const listed = core.listTasks("buyer").tasks;
  assert.ok(listed.some((task) => task.id === draft.job.id));
  assert.equal(core.getTask(draft.job.id, "buyer", { buyerToken: draft.buyerToken }).principalMode, "AGENT");
});

test("stopTask closes unreleased increments", () => {
  const core = createTestCore("stop");
  const draft = createDraft(core, { principalMode: "AGENT" });
  core.postTask({ jobId: draft.job.id, buyerToken: draft.buyerToken });
  const stopped = core.stopTask(draft.job.id, {
    buyerToken: draft.buyerToken,
    note: "Stop after scout-only value is enough."
  });
  assert.equal(stopped.job.status, "cancelled");
  assert.ok(stopped.job.stages.every((stage) => ["refunded", "pending-proof"].includes(stage.status)));
});

test("funding normalization receipt upgrades Uniswap evidence to live", () => {
  const core = createTestCore("funding");
  const draft = createDraft(core, { principalMode: "AGENT" });
  core.postTask({ jobId: draft.job.id, buyerToken: draft.buyerToken });

  core.recordFundingNormalization(draft.job.id, {
    buyerToken: draft.buyerToken,
    provider: "uniswap",
    network: "ethereum-sepolia",
    txHash: "0xabc123",
    chainId: 11155111,
    inputToken: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14",
    outputToken: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    inputAmount: "10000000000000000",
    outputAmount: "55000000",
    quoteId: "quote-1",
    route: "CLASSIC"
  });

  const uniswap = core.getEvidence().evidence.find((item) => item.id === "uniswap");
  assert.equal(uniswap?.status, "live");
  assert.match(uniswap?.href ?? "", /sepolia\.etherscan\.io/);
});

test("paid venue hint lands in agent log as discover-phase work", () => {
  const core = createTestCore("tool");
  const draft = createDraft(core, { principalMode: "AGENT" });
  core.postTask({ jobId: draft.job.id, buyerToken: draft.buyerToken });

  core.recordAgentToolPurchase(draft.job.id, {
    buyerToken: draft.buyerToken,
    provider: "x402",
    network: "eip155:84532",
    txHash: "0xdef456",
    payer: "0xc5CfE770F01A308DF5D840d0Eb15f0b4cF264C81",
    signal: {
      provider: "queuekeeper-x402",
      taskId: draft.job.id,
      signalId: "signal-1",
      coarseArea: "Valencia",
      timingWindow: "This afternoon",
      recommendation: "scout",
      confidence: "scout",
      summary: "Paid venue hint says scout first before escalating.",
      purchasedAt: new Date().toISOString()
    }
  });

  const log = core.getAgentLog(draft.job.id, draft.buyerToken).log;
  assert.equal(log.at(-1)?.phase, "discover");
  assert.match(log.at(-1)?.summary ?? "", /paid venue hint/i);

  const x402 = core.getEvidence().evidence.find((item) => item.id === "x402");
  assert.equal(x402?.status, "live");
  assert.match(x402?.href ?? "", /sepolia\.basescan\.org/);
});

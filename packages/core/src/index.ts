import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import {
  buildPlannerDecision,
  queueStageLabels,
  type AcceptJobResponse,
  type ApiError,
  type ApproveStageRequest,
  type BuyerJobFormInput,
  type CreateJobDraftResponse,
  type DelegationUpdateRequest,
  type DispatchJobRequest,
  type DisputeStageRequest,
  type PlannerAction,
  type PublicPlannerSummary,
  type QueueDisputeStatus,
  type QueueJobMode,
  type QueueJobStatus,
  type QueueJobTimelineResponse,
  type QueueJobView,
  type QueueProofBundleView,
  type QueueSecretPayload,
  type SelfVerificationSessionView,
  type QueueStageKey,
  type QueueStageStatus,
  type QueueStageView,
  type QueueTimelineEventView,
  type QueueViewerRole,
  type ReleaseStageRequest,
  type RevealDataResponse,
  type RunnerVerificationView,
  type SelfVerificationResult,
  type SettleDisputeRequest,
  type SubmitProofRequest
} from "@queuekeeper/shared";

type CoreStageRecord = {
  id: string;
  jobId: string;
  key: QueueStageKey;
  sequence: number;
  label: string;
  amountCusd: number;
  status: QueueStageStatus;
  proofHash: string | null;
  proofSubmittedAt: string | null;
  proofBundleKey: string | null;
  proofDigest: string | null;
  buyerVisibleSummary: string | null;
  imageCount: number;
  reviewWindowEndsAt: string | null;
  autoReleaseAt: string | null;
  disputeWindowSeconds: number;
  releasedAt: string | null;
  disputedAt: string | null;
  disputedReason: string | null;
  settledAt: string | null;
  refundedAt: string | null;
  proofTxHash: string | null;
  releaseTxHash: string | null;
};

type CoreJobRecord = {
  id: string;
  buyerTokenHash: string;
  buyerAddress: string | null;
  mode: QueueJobMode;
  title: string;
  coarseArea: string;
  timingWindow: string;
  verificationRequirement: string;
  plannerAction: PlannerAction;
  plannerReason: string;
  plannerProvider: string;
  selectedRunnerAddress: string | null;
  acceptedRunnerAddress: string | null;
  runnerRevealTokenHash: string | null;
  dispatchRunnerAddress: string | null;
  secretObjectKey: string;
  secretDigest: string;
  status: QueueJobStatus;
  maxSpendCusd: number;
  heartbeatIntervalSeconds: number;
  heartbeatCount: number;
  createdAt: string;
  updatedAt: string;
  postedAt: string | null;
  expiresAt: string;
  disputeStatus: QueueDisputeStatus;
  delegationJson: string;
  chainJson: string;
};

type CoreJobRow = Record<string, unknown>;
type CoreStageRow = Record<string, unknown>;

type StoredProofBundle = {
  stageId: string;
  stageKey: QueueStageKey;
  sequence: number;
  note?: string;
  proofHash: string;
  createdAt: string;
  media: Array<{
    filename: string;
    mimeType: string;
    base64: string;
  }>;
};

type QueueKeeperCoreConfig = {
  dataDir: string;
  databasePath: string;
  objectDir: string;
  encryptionKey: Buffer;
  arbiterToken: string | null;
};

type VerificationSessionRecord = {
  id: string;
  jobId: string;
  runnerAddress: string;
  scope: string;
  appName: string;
  endpoint: string;
  endpointType: "https" | "staging_https" | "celo" | "staging_celo";
  userId: string;
  userIdType: "hex" | "uuid";
  userDefinedData: string;
  status: "pending" | "verified" | "failed";
  provider: "self";
  reference: string;
  verifiedAt: string | null;
  reason: string | null;
  resultJson: string | null;
  createdAt: string;
  updatedAt: string;
};

type VerificationSessionRow = Record<string, unknown>;

type StageTemplate = {
  jobId: string;
  key: QueueStageKey;
  sequence: number;
  label: string;
  amountCusd: number;
  reviewWindowSeconds: number;
  autoReleaseSeconds: number;
  disputeWindowSeconds: number;
};

type AuthContext = {
  buyerToken?: string;
  revealToken?: string;
  arbiterToken?: string;
};

declare global {
  // eslint-disable-next-line no-var
  var __queuekeeperCoreSingleton: QueueKeeperCore | undefined;
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function sha256Hex(value: string | Buffer) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function randomToken() {
  return crypto.randomBytes(24).toString("hex");
}

function nowIso() {
  return new Date().toISOString();
}

function formatCusd(amount: number) {
  return `${amount.toFixed(2)} cUSD`;
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function stableStringify(value: unknown) {
  return JSON.stringify(value, Object.keys(value as Record<string, unknown>).sort());
}

function defaultDataDir() {
  return path.join(process.cwd(), ".queuekeeper-data");
}

function getEncryptionKey() {
  const configured = process.env.QUEUEKEEPER_ENCRYPTION_KEY;
  if (configured) {
    return crypto.createHash("sha256").update(configured).digest();
  }

  if (process.env.NODE_ENV === "production" && process.env.VERCEL) {
    throw new Error("QUEUEKEEPER_ENCRYPTION_KEY is required in production.");
  }

  return crypto.createHash("sha256").update("queuekeeper-dev-encryption-key").digest();
}

function encryptPayload(key: Buffer, payload: Buffer) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
  const tag = cipher.getAuthTag();
  return {
    iv: iv.toString("base64"),
    tag: tag.toString("base64"),
    ciphertext: encrypted.toString("base64")
  };
}

function decryptPayload(key: Buffer, payload: { iv: string; tag: string; ciphertext: string }) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(payload.iv, "base64"));
  decipher.setAuthTag(Buffer.from(payload.tag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, "base64")),
    decipher.final()
  ]);
}

class EncryptedObjectStore {
  constructor(private readonly baseDir: string, private readonly key: Buffer) {
    ensureDir(baseDir);
  }

  writeJson(prefix: string, payload: unknown) {
    const objectKey = `${prefix}/${crypto.randomUUID()}.json.enc`;
    const objectPath = path.join(this.baseDir, objectKey);
    ensureDir(path.dirname(objectPath));
    const encrypted = encryptPayload(this.key, Buffer.from(JSON.stringify(payload)));
    fs.writeFileSync(objectPath, JSON.stringify(encrypted));
    return objectKey;
  }

  readJson<T>(objectKey: string): T {
    const objectPath = path.join(this.baseDir, objectKey);
    const encrypted = parseJson<{ iv: string; tag: string; ciphertext: string }>(fs.readFileSync(objectPath, "utf8"));
    return JSON.parse(decryptPayload(this.key, encrypted).toString("utf8")) as T;
  }
}

export class QueueKeeperCore {
  readonly config: QueueKeeperCoreConfig;
  readonly db: DatabaseSync;
  readonly objectStore: EncryptedObjectStore;

  constructor(config?: Partial<QueueKeeperCoreConfig>) {
    const dataDir = config?.dataDir ?? process.env.QUEUEKEEPER_DATA_DIR ?? defaultDataDir();
    const databasePath = config?.databasePath ?? process.env.QUEUEKEEPER_DATABASE_PATH ?? path.join(dataDir, "queuekeeper.sqlite");
    const objectDir = config?.objectDir ?? process.env.QUEUEKEEPER_OBJECT_DIR ?? path.join(dataDir, "objects");
    const encryptionKey = config?.encryptionKey ?? getEncryptionKey();
    const arbiterToken = config?.arbiterToken ?? process.env.QUEUEKEEPER_ARBITER_TOKEN ?? null;

    ensureDir(path.dirname(databasePath));
    ensureDir(objectDir);

    this.config = { dataDir, databasePath, objectDir, encryptionKey, arbiterToken };
    this.db = new DatabaseSync(databasePath);
    this.objectStore = new EncryptedObjectStore(objectDir, encryptionKey);
    this.initialize();
    this.seedIfEmpty();
  }

  initialize() {
    this.db.exec(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS jobs (
        id TEXT PRIMARY KEY,
        buyer_token_hash TEXT NOT NULL,
        buyer_address TEXT,
        mode TEXT NOT NULL,
        title TEXT NOT NULL,
        coarse_area TEXT NOT NULL,
        timing_window TEXT NOT NULL,
        verification_requirement TEXT NOT NULL,
        planner_action TEXT NOT NULL,
        planner_reason TEXT NOT NULL,
        planner_provider TEXT NOT NULL,
        selected_runner_address TEXT,
        accepted_runner_address TEXT,
        runner_reveal_token_hash TEXT,
        dispatch_runner_address TEXT,
        secret_object_key TEXT NOT NULL,
        secret_digest TEXT NOT NULL,
        status TEXT NOT NULL,
        max_spend_cusd REAL NOT NULL,
        heartbeat_interval_seconds INTEGER NOT NULL,
        heartbeat_count INTEGER NOT NULL,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        posted_at TEXT,
        expires_at TEXT NOT NULL,
        dispute_status TEXT NOT NULL,
        delegation_json TEXT NOT NULL,
        chain_json TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS stages (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        stage_key TEXT NOT NULL,
        sequence INTEGER NOT NULL,
        label TEXT NOT NULL,
        amount_cusd REAL NOT NULL,
        status TEXT NOT NULL,
        proof_hash TEXT,
        proof_submitted_at TEXT,
        proof_bundle_key TEXT,
        proof_digest TEXT,
        buyer_visible_summary TEXT,
        image_count INTEGER NOT NULL DEFAULT 0,
        review_window_ends_at TEXT,
        auto_release_at TEXT,
        dispute_window_seconds INTEGER NOT NULL,
        released_at TEXT,
        disputed_at TEXT,
        disputed_reason TEXT,
        settled_at TEXT,
        refunded_at TEXT,
        proof_tx_hash TEXT,
        release_tx_hash TEXT,
        UNIQUE(job_id, stage_key, sequence)
      );
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        actor_role TEXT NOT NULL,
        actor_address TEXT,
        summary TEXT NOT NULL,
        payload_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS idempotency (
        idempotency_key TEXT PRIMARY KEY,
        route TEXT NOT NULL,
        response_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
      CREATE TABLE IF NOT EXISTS verification_sessions (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL,
        runner_address TEXT NOT NULL,
        scope TEXT NOT NULL,
        app_name TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        endpoint_type TEXT NOT NULL,
        user_id TEXT NOT NULL,
        user_id_type TEXT NOT NULL,
        user_defined_data TEXT NOT NULL,
        status TEXT NOT NULL,
        provider TEXT NOT NULL,
        reference TEXT NOT NULL,
        verified_at TEXT,
        reason TEXT,
        result_json TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
    `);
  }

  withIdempotency<T>(route: string, idempotencyKey: string | undefined, fn: () => T): T {
    if (!idempotencyKey) return fn();

    const existing = this.db.prepare(
      "SELECT response_json FROM idempotency WHERE idempotency_key = ?1 AND route = ?2"
    ).get(idempotencyKey, route) as { response_json: string } | undefined;

    if (existing) {
      return parseJson<T>(existing.response_json);
    }

    const result = fn();
    this.db.prepare(
      "INSERT INTO idempotency (idempotency_key, route, response_json, created_at) VALUES (?1, ?2, ?3, ?4)"
    ).run(idempotencyKey, route, JSON.stringify(result), nowIso());
    return result;
  }

  createJobDraft(input: BuyerJobFormInput & {
    mode?: QueueJobMode;
    plannerAction?: PlannerAction;
    plannerReason?: string;
    plannerProvider?: string;
    verificationRequirement?: string;
  }, idempotencyKey?: string): CreateJobDraftResponse {
    return this.withIdempotency("create-job-draft", idempotencyKey, () => {
      const createdAt = nowIso();
      const jobId = input.id ?? `job_${crypto.randomUUID().slice(0, 12)}`;
      const buyerToken = randomToken();

      const secretPayload: QueueSecretPayload = {
        exactLocation: input.exactLocation,
        hiddenNotes: input.hiddenNotes,
        privateFallbackInstructions: input.privateFallbackInstructions,
        sensitiveBuyerPreferences: input.sensitiveBuyerPreferences,
        handoffSecret: input.handoffSecret
      };

      const secretObjectKey = this.objectStore.writeJson(`jobs/${jobId}/secrets`, secretPayload);
      const plannerAction = input.plannerAction ?? input.plannerPreview?.action ?? "scout-then-hold";
      const plannerReason = input.plannerReason ?? input.plannerPreview?.reason ?? "Planner preview not yet recorded.";
      const plannerProvider = input.plannerProvider ?? "mock";
      const mode = input.mode ?? "DIRECT_DISPATCH";

      this.db.prepare(`
        INSERT INTO jobs (
          id, buyer_token_hash, buyer_address, mode, title, coarse_area, timing_window, verification_requirement,
          planner_action, planner_reason, planner_provider, selected_runner_address, accepted_runner_address,
          runner_reveal_token_hash, dispatch_runner_address, secret_object_key, secret_digest, status, max_spend_cusd,
          heartbeat_interval_seconds, heartbeat_count, created_at, updated_at, posted_at, expires_at, dispute_status,
          delegation_json, chain_json
        ) VALUES (
          ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, NULL,
          NULL, ?13, ?14, ?15, 'draft', ?16, ?17, ?18, ?19, ?19, NULL, ?20, 'none',
          ?21, ?22
        )
      `).run(
        jobId,
        sha256Hex(buyerToken),
        input.buyerAddress ?? null,
        mode,
        input.title,
        input.coarseArea,
        input.timingWindow ?? "Within the next 2 hours",
        "SELF_VERIFIED",
        plannerAction,
        plannerReason,
        plannerProvider,
        mode === "DIRECT_DISPATCH" ? input.selectedRunnerAddress ?? null : null,
        mode === "DIRECT_DISPATCH" ? input.selectedRunnerAddress ?? null : null,
        secretObjectKey,
        sha256Hex(JSON.stringify(secretPayload)),
        input.maxSpendUsd,
        input.heartbeatIntervalSeconds ?? 300,
        input.heartbeatCount ?? 3,
        createdAt,
        new Date(Date.now() + input.expiresInMinutes * 60_000).toISOString(),
        JSON.stringify({
          mode: "mock-bounded-policy",
          status: "not-requested",
          spendCap: formatCusd(input.maxSpendUsd),
          expiry: new Date(Date.now() + input.expiresInMinutes * 60_000).toISOString(),
          approvedToken: process.env.NEXT_PUBLIC_QUEUEKEEPER_TOKEN_ADDRESS ?? process.env.QUEUEKEEPER_TOKEN_ADDRESS ?? "0xEeA30fA689535f7FB45a8A91045E3b1d1c54A3d6",
          approvedContract: process.env.NEXT_PUBLIC_QUEUEKEEPER_ESCROW_ADDRESS ?? process.env.QUEUEKEEPER_ESCROW_ADDRESS ?? "",
          jobId,
          notes: [
            "Spend is bound to this job id and capped to the posted stage schedule.",
            "Only verified runners can accept and reveal the exact destination.",
            "Delegation is treated as inactive until a real permission request succeeds."
          ],
          lastResult: "No live delegation recorded yet.",
          lastUpdatedAt: null,
          requestor: null
        }),
        JSON.stringify({
          onchainJobId: null,
          txHashes: {},
          stableToken: process.env.NEXT_PUBLIC_QUEUEKEEPER_TOKEN_ADDRESS ?? process.env.QUEUEKEEPER_TOKEN_ADDRESS ?? "0xEeA30fA689535f7FB45a8A91045E3b1d1c54A3d6"
        })
      );

      for (const stage of this.buildStagePlan(jobId, input, plannerAction)) {
        this.insertStage(stage);
      }

      this.recordEvent(jobId, "job.drafted", "buyer", input.buyerAddress ?? null, "Draft created with encrypted secret payload.", {
        mode,
        plannerAction
      });

      return {
        job: this.getJob(jobId, "buyer", { buyerToken }),
        buyerToken
      };
    });
  }

  postJob(request: { jobId: string; buyerToken: string; onchainJobId?: string | null; txHash?: string | null; delegation?: DelegationUpdateRequest }) {
    const job = this.requireBuyerJob(request.jobId, request.buyerToken);
    if (job.status !== "draft" && job.status !== "funded") {
      throw this.error("INVALID_STATUS", `Job ${request.jobId} cannot be posted from status ${job.status}.`);
    }

    const delegation = request.delegation ? {
      ...parseJson<Record<string, unknown>>(job.delegationJson),
      ...request.delegation,
      lastUpdatedAt: nowIso(),
      lastResult: request.delegation.result
    } : parseJson<Record<string, unknown>>(job.delegationJson);

    const chain = parseJson<Record<string, unknown>>(job.chainJson);
    const nextChain = {
      ...chain,
      onchainJobId: request.onchainJobId ?? chain.onchainJobId ?? null,
      txHashes: request.txHash ? { ...(chain.txHashes as Record<string, string> | undefined), createJob: request.txHash } : chain.txHashes
    };

    const nextStatus: QueueJobStatus = "posted";
    this.db.prepare(`
      UPDATE jobs
      SET status = ?2, posted_at = ?3, updated_at = ?3, delegation_json = ?4, chain_json = ?5
      WHERE id = ?1
    `).run(request.jobId, nextStatus, nowIso(), JSON.stringify(delegation), JSON.stringify(nextChain));

    this.recordEvent(request.jobId, "job.posted", "buyer", job.buyerAddress, "Buyer funded and posted the job.", {
      onchainJobId: request.onchainJobId ?? null,
      txHash: request.txHash ?? null
    });

    return this.getTimeline(request.jobId, "buyer", { buyerToken: request.buyerToken });
  }

  dispatchJob(jobId: string, request: DispatchJobRequest) {
    const job = this.requireBuyerJob(jobId, request.buyerToken);
    this.db.prepare(`
      UPDATE jobs
      SET dispatch_runner_address = ?2, selected_runner_address = ?2, mode = 'DIRECT_DISPATCH', updated_at = ?3
      WHERE id = ?1
    `).run(jobId, request.runnerAddress, nowIso());

    this.recordEvent(jobId, "job.dispatched", "buyer", job.buyerAddress, "Buyer dispatched the job to a specific verified runner.", {
      runnerAddress: request.runnerAddress
    });

    return this.getTimeline(jobId, "buyer", { buyerToken: request.buyerToken });
  }

  listJobs(viewer: QueueViewerRole = "public") {
    const rows = this.db.prepare("SELECT * FROM jobs ORDER BY updated_at DESC").all() as CoreJobRow[];
    const jobs = rows.map((row) => this.mapJobRow(row));
    for (const row of jobs) this.reconcileJob(row.id);
    const visibleJobs = viewer === "public"
      ? jobs.filter((job) => job.mode === "VERIFIED_POOL" && job.status === "posted" && !job.acceptedRunnerAddress)
      : jobs;
    return {
      jobs: visibleJobs.map((job) => this.toView(this.getJobRecord(job.id), viewer))
    };
  }

  reconcileAllJobs() {
    const rows = this.db.prepare("SELECT id FROM jobs").all() as Array<{ id: string }>;
    for (const row of rows) this.reconcileJob(row.id);
    return {
      reconciled: rows.length,
      publicJobs: this.listJobs("public").jobs.length
    };
  }

  getJob(jobId: string, viewer: QueueViewerRole, auth: AuthContext = {}): QueueJobView {
    this.reconcileJob(jobId);
    const job = this.getJobRecord(jobId);

    if (viewer === "buyer") {
      this.requireBuyerJob(jobId, auth.buyerToken ?? "");
    }
    if (viewer === "runner") {
      this.requireRunnerAccess(jobId, auth.revealToken ?? "");
    }

    return this.toView(job, viewer, auth);
  }

  acceptJob(jobId: string, runnerAddress: string, verification: SelfVerificationResult, txHash?: string): AcceptJobResponse {
    const job = this.getJobRecord(jobId);
    this.reconcileJob(jobId);

    if (job.status !== "posted") {
      throw this.error("INVALID_STATUS", "Only posted jobs can be accepted.");
    }
    if (job.mode === "DIRECT_DISPATCH" && job.dispatchRunnerAddress && job.dispatchRunnerAddress.toLowerCase() !== runnerAddress.toLowerCase()) {
      throw this.error("RUNNER_NOT_DISPATCHED", "This dispatch job is reserved for another verified runner.");
    }
    if (verification.status !== "verified") {
      throw this.error("VERIFICATION_FAILED", verification.reason ?? "Runner verification failed.");
    }

    const revealToken = randomToken();
    const chain = parseJson<Record<string, unknown>>(job.chainJson);
    const nextChain = txHash ? {
      ...chain,
      txHashes: { ...(chain.txHashes as Record<string, string> | undefined), acceptJob: txHash }
    } : chain;
    const nextStatus: QueueJobStatus = this.hasPendingStage(jobId, "scout") ? "accepted" : "holding";

    this.db.prepare(`
      UPDATE jobs
      SET accepted_runner_address = ?2, runner_reveal_token_hash = ?3, status = ?4, updated_at = ?5, chain_json = ?6
      WHERE id = ?1
    `).run(jobId, runnerAddress, sha256Hex(revealToken), nextStatus, nowIso(), JSON.stringify(nextChain));

    this.recordEvent(jobId, "job.accepted", "runner", runnerAddress, "Verified runner accepted the job and unlocked reveal access.", {
      verificationProvider: verification.provider,
      verificationReference: verification.reference
    });

    const acceptedJob = this.getJob(jobId, "runner", { revealToken });
    const secret = this.getRevealData(jobId, revealToken);

    return {
      accepted: true,
      jobId,
      runnerAddress,
      job: {
        ...acceptedJob,
        revealToken
      },
      acceptanceRecord: {
        verificationReference: verification.reference,
        verificationProvider: verification.provider,
        exactLocationRevealAllowed: true,
        revealToken
      },
      exactLocation: secret.exactLocation
    };
  }

  createSelfVerificationSession(jobId: string, runnerAddress: string, origin: string): SelfVerificationSessionView {
    const job = this.getJobRecord(jobId);
    const sessionId = crypto.randomUUID();
    const scope = process.env.NEXT_PUBLIC_SELF_SCOPE ?? process.env.SELF_SCOPE ?? "queuekeeper";
    const appName = process.env.NEXT_PUBLIC_SELF_APP_NAME ?? process.env.SELF_APP_NAME ?? "QueueKeeper";
    const endpointType = (process.env.NEXT_PUBLIC_SELF_ENDPOINT_TYPE ?? process.env.SELF_ENDPOINT_TYPE ?? "staging_https") as SelfVerificationSessionView["endpointType"];
    const endpoint = `${origin}/api/v1/self/sessions/${sessionId}/verify`;
    const userDefinedData = `0x${Buffer.from(JSON.stringify({ jobId, sessionId })).toString("hex")}`;
    const createdAt = nowIso();

    this.db.prepare(`
      INSERT INTO verification_sessions (
        id, job_id, runner_address, scope, app_name, endpoint, endpoint_type, user_id, user_id_type,
        user_defined_data, status, provider, reference, verified_at, reason, result_json, created_at, updated_at
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, 'hex',
        ?9, 'pending', 'self', ?10, NULL, NULL, NULL, ?11, ?11
      )
    `).run(sessionId, jobId, runnerAddress, scope, appName, endpoint, endpointType, runnerAddress, userDefinedData, sessionId, createdAt);

    this.recordEvent(jobId, "verification.session.created", "runner", runnerAddress, "Runner started a Self verification session.", {
      sessionId
    });

    return this.getSelfVerificationSession(sessionId);
  }

  getSelfVerificationSession(sessionId: string): SelfVerificationSessionView {
    const row = this.db.prepare("SELECT * FROM verification_sessions WHERE id = ?1").get(sessionId) as VerificationSessionRow | undefined;
    if (!row) throw this.error("NOT_FOUND", `Verification session ${sessionId} was not found.`);
    return this.mapVerificationSession(row);
  }

  completeSelfVerificationSession(sessionId: string, result: {
    verified: boolean;
    reason?: string | null;
    resultJson?: unknown;
  }) {
    const session = this.getSelfVerificationSession(sessionId);
    const status = result.verified ? "verified" : "failed";
    const verifiedAt = result.verified ? nowIso() : null;
    this.db.prepare(`
      UPDATE verification_sessions
      SET status = ?2, verified_at = ?3, reason = ?4, result_json = ?5, updated_at = ?6
      WHERE id = ?1
    `).run(sessionId, status, verifiedAt, result.reason ?? null, result.resultJson ? JSON.stringify(result.resultJson) : null, nowIso());

    this.recordEvent(session.jobId, "verification.session.completed", "runner", session.runnerAddress, result.verified ? "Self verification succeeded." : "Self verification failed.", {
      sessionId,
      reason: result.reason ?? null
    });

    return this.getSelfVerificationSession(sessionId);
  }

  getRevealData(jobId: string, revealToken: string): RevealDataResponse {
    const job = this.requireRunnerAccess(jobId, revealToken);
    const secret = this.objectStore.readJson<QueueSecretPayload>(job.secretObjectKey);

    return {
      jobId,
      exactLocation: secret.exactLocation,
      hiddenNotes: secret.hiddenNotes,
      privateFallbackInstructions: secret.privateFallbackInstructions,
      sensitiveBuyerPreferences: secret.sensitiveBuyerPreferences,
      handoffSecret: secret.handoffSecret
    };
  }

  submitProof(jobId: string, revealToken: string, request: SubmitProofRequest) {
    const job = this.requireRunnerAccess(jobId, revealToken);
    if (job.disputeStatus === "open") {
      throw this.error("JOB_DISPUTED", "Job is frozen while a dispute is open.");
    }

    const stage = this.getTargetStage(jobId, request);
    if (stage.status !== "pending-proof") {
      throw this.error("INVALID_STAGE", `Stage ${stage.id} is not ready for proof submission.`);
    }

    const createdAt = nowIso();
    const proofHash = request.proofHash;
    const bundle: StoredProofBundle = {
      stageId: stage.id,
      stageKey: stage.key,
      sequence: stage.sequence,
      note: request.note,
      proofHash,
      createdAt,
      media: (request.media ?? []).map((media) => ({
        filename: media.filename,
        mimeType: media.mimeType,
        base64: media.base64
      }))
    };
    const proofBundleKey = this.objectStore.writeJson(`jobs/${jobId}/proofs`, bundle);

    const reviewWindowEndsAt = new Date(Date.now() + this.defaultReviewWindowSeconds(stage.key) * 1000).toISOString();
    const autoReleaseAt = new Date(Date.now() + this.defaultAutoReleaseSeconds(stage.key) * 1000).toISOString();

    this.db.prepare(`
      UPDATE stages
      SET status = 'submitted', proof_hash = ?2, proof_submitted_at = ?3, proof_bundle_key = ?4,
          proof_digest = ?5, buyer_visible_summary = ?6, image_count = ?7, review_window_ends_at = ?8,
          auto_release_at = ?9, proof_tx_hash = ?10
      WHERE id = ?1
    `).run(
      stage.id,
      proofHash,
      createdAt,
      proofBundleKey,
      sha256Hex(JSON.stringify(bundle)),
      request.buyerVisibleSummary ?? request.note ?? `${stage.label} proof submitted`,
      request.media?.length ?? 0,
      reviewWindowEndsAt,
      autoReleaseAt,
      request.txHash ?? null
    );

    const nextJobStatus: QueueJobStatus = stage.key === "scout" ? "scouting" : "holding";
    this.db.prepare("UPDATE jobs SET status = ?2, updated_at = ?3 WHERE id = ?1").run(jobId, nextJobStatus, nowIso());

    this.recordEvent(jobId, "proof.submitted", "runner", job.acceptedRunnerAddress, `${stage.label} proof submitted.`, {
      stageId: stage.id,
      proofHash,
      imageCount: request.media?.length ?? 0
    });

    return this.getTimeline(jobId, "runner", { revealToken });
  }

  getProofBundle(jobId: string, stageId: string, auth: AuthContext): QueueProofBundleView | null {
    const job = this.getJobRecord(jobId);
    if (!this.hasBuyerAuth(job, auth.buyerToken) && !this.hasRunnerAuth(job, auth.revealToken)) {
      throw this.error("UNAUTHORIZED", "Valid buyer or runner token required.");
    }

    const stage = this.getStageById(stageId);
    if (!stage.proofBundleKey) return null;
    const bundle = this.objectStore.readJson<StoredProofBundle>(stage.proofBundleKey);
    return {
      jobId,
      stageId,
      stageKey: bundle.stageKey,
      sequence: bundle.sequence,
      note: bundle.note,
      proofHash: bundle.proofHash,
      createdAt: bundle.createdAt,
      media: bundle.media.map((item) => ({
        filename: item.filename,
        mimeType: item.mimeType,
        dataUrl: `data:${item.mimeType};base64,${item.base64}`
      }))
    };
  }

  approveStage(jobId: string, request: ApproveStageRequest) {
    const job = this.requireBuyerJob(jobId, request.buyerToken);
    if (job.disputeStatus === "open") {
      throw this.error("JOB_DISPUTED", "Job is frozen while a dispute is open.");
    }

    const stage = this.getStageById(request.stageId);
    if (stage.jobId !== jobId) throw this.error("NOT_FOUND", "Stage not found for job.");
    if (stage.status !== "submitted" && stage.status !== "awaiting-release") {
      throw this.error("INVALID_STAGE", "Only submitted stages can be approved.");
    }

    this.db.prepare(`
      UPDATE stages
      SET status = 'approved', released_at = ?2, release_tx_hash = ?3
      WHERE id = ?1
    `).run(stage.id, nowIso(), request.txHash ?? null);

    this.recordEvent(jobId, "stage.approved", "buyer", job.buyerAddress, `${stage.label} payout approved.`, {
      stageId: stage.id,
      txHash: request.txHash ?? null
    });

    this.refreshJobStatus(jobId);
    return this.getTimeline(jobId, "buyer", { buyerToken: request.buyerToken });
  }

  disputeStage(jobId: string, request: DisputeStageRequest) {
    const job = this.requireBuyerJob(jobId, request.buyerToken);
    const stage = this.getStageById(request.stageId);
    if (stage.jobId !== jobId) throw this.error("NOT_FOUND", "Stage not found for job.");
    if (stage.status !== "submitted") {
      throw this.error("INVALID_STAGE", "Only submitted stages can be disputed before release.");
    }

    this.db.prepare(`
      UPDATE stages
      SET status = 'disputed', disputed_at = ?2, disputed_reason = ?3
      WHERE id = ?1
    `).run(stage.id, nowIso(), request.reason);
    this.db.prepare("UPDATE jobs SET status = 'disputed', dispute_status = 'open', updated_at = ?2 WHERE id = ?1").run(jobId, nowIso());

    this.recordEvent(jobId, "stage.disputed", "buyer", job.buyerAddress, `${stage.label} payout disputed.`, {
      stageId: stage.id,
      reason: request.reason
    });

    return this.getTimeline(jobId, "buyer", { buyerToken: request.buyerToken });
  }

  settleDispute(jobId: string, request: SettleDisputeRequest) {
    const job = this.getJobRecord(jobId);
    if (!this.hasBuyerAuth(job, request.buyerToken) && request.arbiterToken !== this.config.arbiterToken) {
      throw this.error("UNAUTHORIZED", "Buyer token or arbiter token required.");
    }

    const stage = this.getStageById(request.stageId);
    if (stage.jobId !== jobId || stage.status !== "disputed") {
      throw this.error("INVALID_STAGE", "Only disputed stages can be settled.");
    }

    const nextStatus = request.resolution === "release-to-runner" ? "settled" : "refunded";
    this.db.prepare(`
      UPDATE stages
      SET status = ?2, settled_at = ?3, refunded_at = CASE WHEN ?2 = 'refunded' THEN ?3 ELSE refunded_at END,
          released_at = CASE WHEN ?2 = 'settled' THEN ?3 ELSE released_at END
      WHERE id = ?1
    `).run(stage.id, nextStatus, nowIso());
    this.db.prepare("UPDATE jobs SET dispute_status = 'settled', status = 'holding', updated_at = ?2 WHERE id = ?1").run(jobId, nowIso());

    this.recordEvent(jobId, "dispute.settled", request.arbiterToken ? "arbiter" : "buyer", job.buyerAddress, `Dispute settled with resolution ${request.resolution}.`, {
      stageId: stage.id,
      resolution: request.resolution,
      note: request.note ?? null
    });

    this.refreshJobStatus(jobId);
    return this.getTimeline(jobId, request.buyerToken ? "buyer" : "public", { buyerToken: request.buyerToken });
  }

  updateDelegation(jobId: string, request: DelegationUpdateRequest, buyerToken: string) {
    const job = this.requireBuyerJob(jobId, buyerToken);
    const current = parseJson<Record<string, unknown>>(job.delegationJson);
    const next = {
      ...current,
      ...request,
      lastUpdatedAt: nowIso(),
      lastResult: request.result
    };
    this.db.prepare("UPDATE jobs SET delegation_json = ?2, updated_at = ?3 WHERE id = ?1").run(jobId, JSON.stringify(next), nowIso());
    this.recordEvent(jobId, "delegation.updated", "buyer", job.buyerAddress, "Delegation policy updated.", {
      mode: request.mode,
      status: request.status
    });
    return this.getTimeline(jobId, "buyer", { buyerToken });
  }

  getTimeline(jobId: string, viewer: QueueViewerRole, auth: AuthContext = {}): QueueJobTimelineResponse {
    const job = this.getJob(jobId, viewer, auth);
    const events = this.db.prepare("SELECT * FROM events WHERE job_id = ?1 ORDER BY created_at ASC").all(jobId) as Array<{
      id: string;
      event_type: string;
      actor_role: QueueTimelineEventView["actorRole"];
      actor_address: string | null;
      summary: string;
      payload_json: string;
      created_at: string;
    }>;
    return {
      job,
      events: events.map((event) => ({
        id: event.id,
        jobId,
        type: event.event_type,
        actorRole: event.actor_role,
        actorAddress: event.actor_address,
        summary: event.summary,
        createdAt: event.created_at,
        payload: parseJson<Record<string, unknown>>(event.payload_json)
      }))
    };
  }

  openApiDocument(baseUrl = "https://api.queuekeeper.local") {
    return {
      openapi: "3.1.0",
      info: {
        title: "QueueKeeper API",
        version: "0.1.0",
        description: "Headless API for private queue dispatch, verification, encrypted proofs, and staged payouts."
      },
      servers: [{ url: baseUrl }],
      paths: {
        "/v1/jobs/drafts": { post: { summary: "Create job draft" } },
        "/v1/planner/preview": { post: { summary: "Preview planner decision" } },
        "/v1/jobs/{jobId}/post": { post: { summary: "Fund and post job" } },
        "/v1/jobs": { get: { summary: "List redacted jobs" } },
        "/v1/jobs/{jobId}": { get: { summary: "Fetch job detail" } },
        "/v1/jobs/{jobId}/dispatch": { post: { summary: "Dispatch a job to a specific runner" } },
        "/v1/jobs/{jobId}/accept": { post: { summary: "Accept a job after verification" } },
        "/v1/jobs/{jobId}/reveal": { get: { summary: "Fetch authorized reveal data" } },
        "/v1/jobs/{jobId}/proofs": { post: { summary: "Submit encrypted proof bundle" } },
        "/v1/jobs/{jobId}/proofs/{stageId}": { get: { summary: "Fetch decrypted proof bundle" } },
        "/v1/jobs/{jobId}/stages/{stageId}/approve": { post: { summary: "Approve payout stage" } },
        "/v1/jobs/{jobId}/stages/{stageId}/dispute": { post: { summary: "Dispute payout stage" } },
        "/v1/jobs/{jobId}/dispute/settle": { post: { summary: "Settle disputed stage" } },
        "/v1/jobs/{jobId}/timeline": { get: { summary: "Fetch receipts timeline" } }
      }
    };
  }

  private buildStagePlan(jobId: string, input: BuyerJobFormInput, plannerAction: PlannerAction): StageTemplate[] {
    const heartbeatCount = input.heartbeatCount ?? 3;
    const stages: StageTemplate[] = [];
    if (plannerAction !== "hold-now" && input.scoutFeeUsd > 0) {
      stages.push({
        jobId,
        key: "scout",
        sequence: 1,
        label: queueStageLabels.scout,
        amountCusd: input.scoutFeeUsd,
        reviewWindowSeconds: 600,
        autoReleaseSeconds: 600,
        disputeWindowSeconds: 900
      });
    }
    if (plannerAction !== "scout-only" && input.arrivalFeeUsd > 0) {
      stages.push({
        jobId,
        key: "arrival",
        sequence: 1,
        label: queueStageLabels.arrival,
        amountCusd: input.arrivalFeeUsd,
        reviewWindowSeconds: 900,
        autoReleaseSeconds: 900,
        disputeWindowSeconds: 900
      });
    }
    if (plannerAction !== "scout-only" && input.heartbeatFeeUsd > 0) {
      for (let index = 0; index < heartbeatCount; index += 1) {
        stages.push({
          jobId,
          key: "heartbeat",
          sequence: index + 1,
          label: `${queueStageLabels.heartbeat} ${index + 1}`,
          amountCusd: input.heartbeatFeeUsd,
          reviewWindowSeconds: input.heartbeatIntervalSeconds ?? 300,
          autoReleaseSeconds: input.heartbeatIntervalSeconds ?? 300,
          disputeWindowSeconds: 600
        });
      }
    }
    if (plannerAction !== "scout-only" && input.completionFeeUsd > 0) {
      stages.push({
        jobId,
        key: "completion",
        sequence: 1,
        label: queueStageLabels.completion,
        amountCusd: input.completionFeeUsd,
        reviewWindowSeconds: 1800,
        autoReleaseSeconds: 3600,
        disputeWindowSeconds: 3600
      });
    }

    return stages.map((stage) => ({
      ...stage,
      id: `${jobId}:${stage.key}:${stage.sequence}`
    }));
  }

  private seedIfEmpty() {
    const directCount = this.db.prepare("SELECT COUNT(*) as count FROM jobs WHERE mode = 'DIRECT_DISPATCH'").get() as { count: number };
    if (directCount.count === 0) {
      const draft = this.createJobDraft({
        mode: "DIRECT_DISPATCH",
        title: "Conference merch queue hold",
        coarseArea: "Moscone West / Howard St",
        timingWindow: "Today, next 2 hours",
        exactLocation: "North entrance merch queue next to the red sponsor arch",
        hiddenNotes: "Scout first, then hold only if the line stays shorter than the block corner.",
        privateFallbackInstructions: "Abort if staff begins wristband-only access.",
        sensitiveBuyerPreferences: "Buyer only needs the spot, not the merch itself.",
        handoffSecret: "MERCH-2026-HANDOFF",
        waitingToleranceMinutes: 10,
        maxSpendUsd: 35,
        scoutFeeUsd: 4,
        arrivalFeeUsd: 6,
        heartbeatFeeUsd: 5,
        completionFeeUsd: 15,
        expiresInMinutes: 120,
        heartbeatCount: 3,
        heartbeatIntervalSeconds: 300,
        buyerAddress: "0xb0b0000000000000000000000000000000000001",
        selectedRunnerAddress: "0xa11ce0000000000000000000000000000000001",
        plannerAction: "scout-then-hold",
        plannerReason: "Seeded dispatch-first demo path.",
        plannerProvider: "seed"
      });

      this.postJob({
        jobId: draft.job.id,
        buyerToken: draft.buyerToken
      });
    }

    const poolCount = this.db.prepare("SELECT COUNT(*) as count FROM jobs WHERE mode = 'VERIFIED_POOL'").get() as { count: number };
    if (poolCount.count === 0) {
      const poolDraft = this.createJobDraft({
        mode: "VERIFIED_POOL",
        title: "Cafe opening queue scout",
        coarseArea: "Mission / Valencia",
        timingWindow: "This afternoon",
        exactLocation: "Valencia side entrance near the patio gate",
        hiddenNotes: "Scout only if the line is under 20 people.",
        privateFallbackInstructions: "Abort if the staff switches to reservation-only entry.",
        waitingToleranceMinutes: 20,
        maxSpendUsd: 18,
        scoutFeeUsd: 3,
        arrivalFeeUsd: 4,
        heartbeatFeeUsd: 2,
        completionFeeUsd: 5,
        expiresInMinutes: 90,
        heartbeatCount: 2,
        heartbeatIntervalSeconds: 180,
        buyerAddress: "0xb0b0000000000000000000000000000000000002",
        plannerAction: "scout-only",
        plannerReason: "Seeded verified-pool path.",
        plannerProvider: "seed"
      });

      this.postJob({
        jobId: poolDraft.job.id,
        buyerToken: poolDraft.buyerToken
      });
    }
  }

  private insertStage(stage: StageTemplate & { id?: string }) {
    const stageId = stage.id ?? `${stage.jobId}:${stage.key}:${stage.sequence}`;
    this.db.prepare(`
      INSERT INTO stages (
        id, job_id, stage_key, sequence, label, amount_cusd, status, proof_hash, proof_submitted_at,
        proof_bundle_key, proof_digest, buyer_visible_summary, image_count, review_window_ends_at,
        auto_release_at, dispute_window_seconds, released_at, disputed_at, disputed_reason, settled_at,
        refunded_at, proof_tx_hash, release_tx_hash
      ) VALUES (
        ?1, ?2, ?3, ?4, ?5, ?6, 'pending-proof', NULL, NULL,
        NULL, NULL, NULL, 0, NULL,
        NULL, ?7, NULL, NULL, NULL, NULL,
        NULL, NULL, NULL
      )
    `).run(stageId, stage.jobId, stage.key, stage.sequence, stage.label, stage.amountCusd, stage.disputeWindowSeconds);
  }

  private reconcileJob(jobId: string) {
    const job = this.getJobRecord(jobId);
    const now = Date.now();
    if (job.disputeStatus === "open") return;

    if ((job.status === "posted" || job.status === "accepted" || job.status === "scouting" || job.status === "holding") && new Date(job.expiresAt).getTime() <= now) {
      this.db.prepare(`
        UPDATE stages
        SET status = CASE
          WHEN status IN ('pending-proof', 'submitted', 'awaiting-release') THEN 'refunded'
          ELSE status
        END,
        refunded_at = CASE
          WHEN status IN ('pending-proof', 'submitted', 'awaiting-release') THEN ?2
          ELSE refunded_at
        END
        WHERE job_id = ?1
      `).run(jobId, nowIso());
      this.db.prepare("UPDATE jobs SET status = 'refunded', updated_at = ?2 WHERE id = ?1").run(jobId, nowIso());
      this.recordEvent(jobId, "job.refunded", "system", null, "Job expired and refunded all unreleased stages.", {});
      return;
    }

    const stages = this.getStages(jobId);
    for (const stage of stages) {
      if (stage.status === "submitted" && stage.autoReleaseAt && new Date(stage.autoReleaseAt).getTime() <= now) {
        this.db.prepare("UPDATE stages SET status = 'auto-released', released_at = ?2 WHERE id = ?1").run(stage.id, nowIso());
        this.recordEvent(jobId, "stage.auto-released", "system", null, `${stage.label} auto-released after timeout.`, {
          stageId: stage.id
        });
      }
    }

    this.refreshJobStatus(jobId);
  }

  private refreshJobStatus(jobId: string) {
    const job = this.getJobRecord(jobId);
    const stages = this.getStages(jobId);
    const openDispute = stages.some((stage) => stage.status === "disputed");
    const allReleased = stages.length > 0 && stages.every((stage) => ["approved", "auto-released", "settled"].includes(stage.status));
    const anySubmitted = stages.some((stage) => stage.status === "submitted");
    const anyProofPending = stages.some((stage) => stage.status === "pending-proof");
    const hasScoutOnlyPlan = job.plannerAction === "scout-only";

    let nextStatus: QueueJobStatus = job.status;
    if (openDispute) {
      nextStatus = "disputed";
    } else if (allReleased) {
      nextStatus = "completed";
    } else if (job.acceptedRunnerAddress && anySubmitted) {
      nextStatus = "holding";
    } else if (job.acceptedRunnerAddress && anyProofPending) {
      nextStatus = "accepted";
    } else if (job.postedAt) {
      nextStatus = "posted";
    }

    if (hasScoutOnlyPlan && stages.every((stage) => ["approved", "auto-released", "settled"].includes(stage.status))) {
      nextStatus = "completed";
    }

    this.db.prepare("UPDATE jobs SET status = ?2, dispute_status = ?3, updated_at = ?4 WHERE id = ?1").run(
      jobId,
      nextStatus,
      openDispute ? "open" : job.disputeStatus === "settled" ? "settled" : "none",
      nowIso()
    );
  }

  private toView(job: CoreJobRecord, viewer: QueueViewerRole, auth: AuthContext = {}): QueueJobView {
    const stages = this.getStages(job.id);
    const canReveal = viewer === "buyer"
      ? this.hasBuyerAuth(job, auth.buyerToken)
      : viewer === "runner"
        ? this.hasRunnerAuth(job, auth.revealToken)
        : false;
    const secret = canReveal ? this.objectStore.readJson<QueueSecretPayload>(job.secretObjectKey) : null;
    const delegation = parseJson<Record<string, unknown>>(job.delegationJson);
    const chain = parseJson<Record<string, unknown>>(job.chainJson);
    const totalReleased = stages
      .filter((stage) => ["approved", "auto-released", "settled"].includes(stage.status))
      .reduce((sum, stage) => sum + stage.amountCusd, 0);
    const totalEscrow = stages.reduce((sum, stage) => sum + stage.amountCusd, 0);

    return {
      id: job.id,
      mode: job.mode,
      title: job.title,
      coarseArea: job.coarseArea,
      timingWindow: job.timingWindow,
      exactLocationHint: canReveal ? secret?.exactLocation : "Exact destination is encrypted and only revealed after verified acceptance.",
      exactLocationVisibleToViewer: canReveal ? secret?.exactLocation ?? null : null,
      status: this.getJobRecord(job.id).status,
      maxSpend: formatCusd(job.maxSpendCusd),
      delegationSummary: `${delegation.mode as string} · ${delegation.spendCap as string}`,
      runnerVerified: Boolean(job.acceptedRunnerAddress),
      runnerVerification: {
        status: job.acceptedRunnerAddress ? "verified" : "pending",
        provider: job.acceptedRunnerAddress ? "self" : "mock-self",
        reference: job.acceptedRunnerAddress ? "stored-on-accept" : "pending",
        verifiedAt: job.acceptedRunnerAddress ? job.updatedAt : null
      },
      currentStage: this.describeCurrentStage(job, stages),
      keptPrivate: [
        "Exact destination",
        "Hidden notes",
        "Fallback instructions",
        "Proof media",
        "Handoff secret"
      ],
      payoutSummary: `${formatCusd(totalReleased)} released · ${formatCusd(totalEscrow - totalReleased)} remaining`,
      stages: stages.map((stage) => this.toStageView(stage)),
      policy: {
        mode: delegation.mode as QueueJobView["policy"]["mode"],
        status: delegation.status as QueueJobView["policy"]["status"],
        spendCap: delegation.spendCap as string,
        expiry: delegation.expiry as string,
        approvedToken: delegation.approvedToken as string,
        approvedContract: delegation.approvedContract as string,
        jobId: job.id,
        notes: delegation.notes as string[],
        lastResult: delegation.lastResult as string,
        lastUpdatedAt: delegation.lastUpdatedAt as string | null,
        requestor: delegation.requestor as string | null
      },
      createdAt: job.createdAt,
      updatedAt: job.updatedAt,
      expiresAt: job.expiresAt,
      selectedRunnerAddress: job.selectedRunnerAddress ?? undefined,
      acceptedRunnerAddress: job.acceptedRunnerAddress ?? undefined,
      onchainJobId: (chain.onchainJobId as string | null | undefined) ?? null,
      plannerPreview: {
        action: job.plannerAction,
        reason: job.plannerReason,
        selectedRunnerAddress: job.selectedRunnerAddress ?? undefined
      },
      plannerProvider: job.plannerProvider,
      disputeStatus: job.disputeStatus,
      buyerSessionToken: viewer === "buyer" && auth.buyerToken ? auth.buyerToken : undefined,
      revealToken: viewer === "runner" && auth.revealToken ? auth.revealToken : undefined,
      heartbeatIntervalSeconds: job.heartbeatIntervalSeconds,
      heartbeatCount: job.heartbeatCount,
      reviewWindowsSummary: `${job.heartbeatIntervalSeconds}s heartbeat cadence with buyer review + timeout auto-release`,
      explorerLinks: this.buildExplorerLinks(chain)
    };
  }

  private toStageView(stage: CoreStageRecord): QueueStageView {
    return {
      stageId: stage.id,
      key: stage.key,
      label: stage.label,
      amount: formatCusd(stage.amountCusd),
      released: ["approved", "auto-released", "settled"].includes(stage.status),
      status: stage.status,
      sequence: stage.sequence,
      proofHash: stage.proofHash ?? "pending",
      proofSubmittedAt: stage.proofSubmittedAt,
      releasedAt: stage.releasedAt,
      timestamp: stage.releasedAt
        ? `Released ${stage.releasedAt}`
        : stage.proofSubmittedAt
          ? `Proof submitted ${stage.proofSubmittedAt}`
          : "No proof submitted yet",
      reviewWindowEndsAt: stage.reviewWindowEndsAt,
      autoReleaseAt: stage.autoReleaseAt,
      disputedAt: stage.disputedAt,
      disputeReason: stage.disputedReason,
      proofBundleAvailable: Boolean(stage.proofBundleKey),
      imageCount: stage.imageCount,
      proofTxHash: stage.proofTxHash,
      releaseTxHash: stage.releaseTxHash
    };
  }

  private buildExplorerLinks(chain: Record<string, unknown>) {
    const explorerBase = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_BASE_URL ?? process.env.QUEUEKEEPER_BLOCK_EXPLORER_BASE_URL ?? "https://celo-sepolia.blockscout.com";
    const links: QueueJobView["explorerLinks"] = [
      { label: "Escrow contract", href: `${explorerBase}/address/${process.env.NEXT_PUBLIC_QUEUEKEEPER_ESCROW_ADDRESS ?? process.env.QUEUEKEEPER_ESCROW_ADDRESS ?? ""}`, kind: "contract" as const }
    ];
    const txHashes = (chain.txHashes as Record<string, string> | undefined) ?? {};
    for (const [key, txHash] of Object.entries(txHashes)) {
      links.push({ label: `Tx ${key}`, href: `${explorerBase}/tx/${txHash}`, kind: "tx" as const });
    }
    return links.filter((entry) => !entry.href.endsWith("/"));
  }

  private describeCurrentStage(job: CoreJobRecord, stages: CoreStageRecord[]) {
    const disputed = stages.find((stage) => stage.status === "disputed");
    if (disputed) return `${disputed.label} is disputed and unreleased funds are frozen.`;
    const pending = stages.find((stage) => stage.status === "submitted");
    if (pending) return `${pending.label} proof is waiting for approval or timeout auto-release.`;
    const nextStage = stages.find((stage) => stage.status === "pending-proof");
    if (nextStage) return `${nextStage.label} is the next runner action.`;
    if (stages.every((stage) => ["approved", "auto-released", "settled"].includes(stage.status))) {
      return "All configured stages are complete.";
    }
    return `Job status is ${job.status}.`;
  }

  private getJobRecord(jobId: string): CoreJobRecord {
    const row = this.db.prepare("SELECT * FROM jobs WHERE id = ?1").get(jobId) as CoreJobRow | undefined;
    if (!row) throw this.error("NOT_FOUND", `Job ${jobId} was not found.`);
    return this.mapJobRow(row);
  }

  private getStages(jobId: string): CoreStageRecord[] {
    const rows = this.db.prepare("SELECT * FROM stages WHERE job_id = ?1 ORDER BY CASE stage_key WHEN 'scout' THEN 1 WHEN 'arrival' THEN 2 WHEN 'heartbeat' THEN 3 ELSE 4 END, sequence ASC").all(jobId) as CoreStageRow[];
    return rows.map((row) => this.mapStageRow(row));
  }

  private getStageById(stageId: string): CoreStageRecord {
    const row = this.db.prepare("SELECT * FROM stages WHERE id = ?1").get(stageId) as CoreStageRow | undefined;
    if (!row) throw this.error("NOT_FOUND", `Stage ${stageId} was not found.`);
    return this.mapStageRow(row);
  }

  private getTargetStage(jobId: string, request: SubmitProofRequest) {
    if (request.stageId) return this.getStageById(request.stageId);
    const sequence = request.sequence ?? 1;
    const row = this.db.prepare("SELECT * FROM stages WHERE job_id = ?1 AND stage_key = ?2 AND sequence = ?3").get(jobId, request.stageKey, sequence) as CoreStageRow | undefined;
    if (!row) throw this.error("NOT_FOUND", "Target stage was not found.");
    return this.mapStageRow(row);
  }

  private requireBuyerJob(jobId: string, buyerToken: string) {
    const job = this.getJobRecord(jobId);
    if (!this.hasBuyerAuth(job, buyerToken)) {
      throw this.error("UNAUTHORIZED", "Valid buyer token required.");
    }
    return job;
  }

  private requireRunnerAccess(jobId: string, revealToken: string) {
    const job = this.getJobRecord(jobId);
    if (!this.hasRunnerAuth(job, revealToken)) {
      throw this.error("UNAUTHORIZED", "Valid reveal token required.");
    }
    return job;
  }

  private hasBuyerAuth(job: CoreJobRecord, buyerToken?: string) {
    return Boolean(buyerToken) && sha256Hex(buyerToken as string) === job.buyerTokenHash;
  }

  private hasRunnerAuth(job: CoreJobRecord, revealToken?: string) {
    return Boolean(revealToken) && sha256Hex(revealToken as string) === job.runnerRevealTokenHash;
  }

  private hasPendingStage(jobId: string, key: QueueStageKey) {
    const row = this.db.prepare("SELECT id FROM stages WHERE job_id = ?1 AND stage_key = ?2 LIMIT 1").get(jobId, key) as { id: string } | undefined;
    return Boolean(row);
  }

  private mapVerificationSession(row: VerificationSessionRow): SelfVerificationSessionView {
    return {
      sessionId: String(row.id),
      jobId: String(row.job_id),
      runnerAddress: String(row.runner_address),
      scope: String(row.scope),
      appName: String(row.app_name),
      endpoint: String(row.endpoint),
      endpointType: row.endpoint_type as SelfVerificationSessionView["endpointType"],
      userId: String(row.user_id),
      userIdType: row.user_id_type as SelfVerificationSessionView["userIdType"],
      userDefinedData: String(row.user_defined_data),
      status: row.status as SelfVerificationSessionView["status"],
      provider: "self",
      reference: String(row.reference),
      verifiedAt: row.verified_at ? String(row.verified_at) : null,
      reason: row.reason ? String(row.reason) : null
    };
  }

  private mapJobRow(row: CoreJobRow): CoreJobRecord {
    return {
      id: String(row.id),
      buyerTokenHash: String(row.buyer_token_hash),
      buyerAddress: row.buyer_address ? String(row.buyer_address) : null,
      mode: row.mode as QueueJobMode,
      title: String(row.title),
      coarseArea: String(row.coarse_area),
      timingWindow: String(row.timing_window),
      verificationRequirement: String(row.verification_requirement),
      plannerAction: row.planner_action as PlannerAction,
      plannerReason: String(row.planner_reason),
      plannerProvider: String(row.planner_provider),
      selectedRunnerAddress: row.selected_runner_address ? String(row.selected_runner_address) : null,
      acceptedRunnerAddress: row.accepted_runner_address ? String(row.accepted_runner_address) : null,
      runnerRevealTokenHash: row.runner_reveal_token_hash ? String(row.runner_reveal_token_hash) : null,
      dispatchRunnerAddress: row.dispatch_runner_address ? String(row.dispatch_runner_address) : null,
      secretObjectKey: String(row.secret_object_key),
      secretDigest: String(row.secret_digest),
      status: row.status as QueueJobStatus,
      maxSpendCusd: Number(row.max_spend_cusd),
      heartbeatIntervalSeconds: Number(row.heartbeat_interval_seconds),
      heartbeatCount: Number(row.heartbeat_count),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      postedAt: row.posted_at ? String(row.posted_at) : null,
      expiresAt: String(row.expires_at),
      disputeStatus: row.dispute_status as QueueDisputeStatus,
      delegationJson: String(row.delegation_json),
      chainJson: String(row.chain_json)
    };
  }

  private mapStageRow(row: CoreStageRow): CoreStageRecord {
    return {
      id: String(row.id),
      jobId: String(row.job_id),
      key: row.stage_key as QueueStageKey,
      sequence: Number(row.sequence),
      label: String(row.label),
      amountCusd: Number(row.amount_cusd),
      status: row.status as QueueStageStatus,
      proofHash: row.proof_hash ? String(row.proof_hash) : null,
      proofSubmittedAt: row.proof_submitted_at ? String(row.proof_submitted_at) : null,
      proofBundleKey: row.proof_bundle_key ? String(row.proof_bundle_key) : null,
      proofDigest: row.proof_digest ? String(row.proof_digest) : null,
      buyerVisibleSummary: row.buyer_visible_summary ? String(row.buyer_visible_summary) : null,
      imageCount: Number(row.image_count ?? 0),
      reviewWindowEndsAt: row.review_window_ends_at ? String(row.review_window_ends_at) : null,
      autoReleaseAt: row.auto_release_at ? String(row.auto_release_at) : null,
      disputeWindowSeconds: Number(row.dispute_window_seconds),
      releasedAt: row.released_at ? String(row.released_at) : null,
      disputedAt: row.disputed_at ? String(row.disputed_at) : null,
      disputedReason: row.disputed_reason ? String(row.disputed_reason) : null,
      settledAt: row.settled_at ? String(row.settled_at) : null,
      refundedAt: row.refunded_at ? String(row.refunded_at) : null,
      proofTxHash: row.proof_tx_hash ? String(row.proof_tx_hash) : null,
      releaseTxHash: row.release_tx_hash ? String(row.release_tx_hash) : null
    };
  }

  private recordEvent(jobId: string, eventType: string, actorRole: QueueTimelineEventView["actorRole"], actorAddress: string | null, summary: string, payload: Record<string, unknown>) {
    this.db.prepare(`
      INSERT INTO events (id, job_id, event_type, actor_role, actor_address, summary, payload_json, created_at)
      VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
    `).run(crypto.randomUUID(), jobId, eventType, actorRole, actorAddress, summary, JSON.stringify(payload), nowIso());
  }

  private defaultReviewWindowSeconds(stageKey: QueueStageKey) {
    return stageKey === "completion" ? 1800 : stageKey === "heartbeat" ? 300 : 900;
  }

  private defaultAutoReleaseSeconds(stageKey: QueueStageKey) {
    return stageKey === "completion" ? 3600 : stageKey === "heartbeat" ? 300 : 900;
  }

  private error(code: string, message: string, details?: Record<string, unknown>): Error & ApiError["error"] {
    const error = new Error(message) as Error & ApiError["error"];
    error.code = code;
    error.details = details;
    return error;
  }
}

export function getQueueKeeperCore() {
  if (!global.__queuekeeperCoreSingleton) {
    global.__queuekeeperCoreSingleton = new QueueKeeperCore();
  }
  return global.__queuekeeperCoreSingleton;
}

export { handleQueueKeeperApi } from "./router";

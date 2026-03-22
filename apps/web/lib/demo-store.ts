import "server-only";

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  buildPlannerDecision,
  queueStageLabels,
  queueStageOrder,
  toPublicPlannerSummary,
  type AcceptJobResponse,
  type BuyerJobFormInput,
  type DelegationUpdateRequest,
  type DelegationPolicyMode,
  type DelegationPolicyStatus,
  type PublicPlannerSummary,
  type QueueJobStatus,
  type QueueJobView,
  type QueueStageKey,
  type QueueStageView,
  type QueueViewerRole,
  type ReleaseStageRequest,
  type RunnerVerificationView,
  type SelfVerificationResult,
  type SubmitProofRequest
} from "@queuekeeper/shared";
import { buildPlannerInputFromBuyerForm, demoRunnerCandidates, getDefaultBuyerFormInput, getDefaultEscrowAddress, getDefaultTokenAddress } from "./demo-data";
import { buildContractExplorerLinks } from "./explorer";

type DemoStageRecord = {
  key: QueueStageKey;
  amountUsd: number;
  proofHash: string | null;
  proofSubmittedAt: string | null;
  proofTxHash: string | null;
  released: boolean;
  releasedAt: string | null;
  releaseTxHash: string | null;
};

type DemoDelegationRecord = {
  mode: DelegationPolicyMode;
  status: DelegationPolicyStatus;
  approvedToken: string;
  approvedContract: string;
  spendCapUsd: number;
  expiresAt: string;
  notes: string[];
  lastResult: string;
  lastUpdatedAt: string | null;
  requestor: string | null;
};

type DemoJobRecord = {
  id: string;
  title: string;
  coarseArea: string;
  exactLocation: string;
  hiddenNotes: string;
  maxSpendUsd: number;
  buyerAddress: string;
  selectedRunnerAddress: string;
  acceptedRunnerAddress: string | null;
  revealToken: string | null;
  status: QueueJobStatus;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  plannerPreview: PublicPlannerSummary;
  runnerVerification: RunnerVerificationView;
  keptPrivate: string[];
  stages: DemoStageRecord[];
  delegation: DemoDelegationRecord;
};

type DemoStore = {
  jobs: DemoJobRecord[];
};

const storeFile = path.join(os.tmpdir(), "queuekeeper-demo-store.json");
const useFileBackedStore = process.env.NODE_ENV !== "production" && !process.env.VERCEL;

declare global {
  var __queuekeeperDemoStoreCache: DemoStore | undefined;
}

function nowIso() {
  return new Date().toISOString();
}

function formatUsd(amount: number) {
  return `${amount} cUSD`;
}

function createDemoStages(form: BuyerJobFormInput): DemoStageRecord[] {
  return [
    { key: "scout", amountUsd: form.scoutFeeUsd, proofHash: null, proofSubmittedAt: null, proofTxHash: null, released: false, releasedAt: null, releaseTxHash: null },
    { key: "arrival", amountUsd: form.arrivalFeeUsd, proofHash: null, proofSubmittedAt: null, proofTxHash: null, released: false, releasedAt: null, releaseTxHash: null },
    { key: "heartbeat", amountUsd: form.heartbeatFeeUsd, proofHash: null, proofSubmittedAt: null, proofTxHash: null, released: false, releasedAt: null, releaseTxHash: null },
    { key: "completion", amountUsd: form.completionFeeUsd, proofHash: null, proofSubmittedAt: null, proofTxHash: null, released: false, releasedAt: null, releaseTxHash: null }
  ];
}

function makeDelegationRecord(form: BuyerJobFormInput, existing?: DemoDelegationRecord): DemoDelegationRecord {
  return {
    mode: existing?.mode ?? "mock-bounded-policy",
    status: existing?.status ?? "mock-fallback",
    approvedToken: existing?.approvedToken ?? getDefaultTokenAddress(),
    approvedContract: existing?.approvedContract ?? getDefaultEscrowAddress(),
    spendCapUsd: form.maxSpendUsd,
    expiresAt: new Date(Date.now() + form.expiresInMinutes * 60_000).toISOString(),
    notes: existing?.notes ?? [
      "Demo fallback caps spend to the staged payout total.",
      "Exact location stays server-side until verified acceptance succeeds.",
      "MetaMask delegation is only marked active after a successful in-browser permission request."
    ],
    lastResult: existing?.lastResult ?? "No MetaMask permission request recorded yet.",
    lastUpdatedAt: existing?.lastUpdatedAt ?? null,
    requestor: existing?.requestor ?? null
  };
}

function createDemoJobRecord(form: BuyerJobFormInput, existing?: DemoJobRecord): DemoJobRecord {
  const createdAt = existing?.createdAt ?? nowIso();
  const plannerPreview = form.plannerPreview ?? toPublicPlannerSummary(buildPlannerDecision(buildPlannerInputFromBuyerForm(form)));
  const selectedRunnerAddress = plannerPreview.selectedRunnerAddress ?? form.selectedRunnerAddress ?? demoRunnerCandidates[0].address;

  return {
    id: existing?.id ?? `qk-${crypto.randomUUID().slice(0, 8)}`,
    title: form.title,
    coarseArea: form.coarseArea,
    exactLocation: form.exactLocation,
    hiddenNotes: form.hiddenNotes,
    maxSpendUsd: form.maxSpendUsd,
    buyerAddress: form.buyerAddress ?? existing?.buyerAddress ?? "0xb0b0000000000000000000000000000000000001",
    selectedRunnerAddress,
    acceptedRunnerAddress: null,
    revealToken: null,
    status: "posted",
    createdAt,
    updatedAt: nowIso(),
    expiresAt: new Date(Date.now() + form.expiresInMinutes * 60_000).toISOString(),
    plannerPreview,
    runnerVerification: {
      status: "pending",
      provider: "mock-self",
      reference: "not-yet-verified",
      verifiedAt: null
    },
    keptPrivate: [
      "Exact destination",
      "Hidden buyer max budget",
      "Fallback instructions",
      "Detailed handoff notes"
    ],
    stages: createDemoStages(form),
    delegation: makeDelegationRecord(form, existing?.delegation)
  };
}

function createSeededStore(): DemoStore {
  return {
    jobs: [
      createDemoJobRecord(getDefaultBuyerFormInput(), {
        ...createDemoJobRecord(getDefaultBuyerFormInput()),
        id: "qk-demo-1",
        updatedAt: nowIso()
      })
    ]
  };
}

function ensureStoreFile(store: DemoStore) {
  if (!useFileBackedStore) return;
  fs.writeFileSync(storeFile, JSON.stringify(store, null, 2));
}

function loadStore(): DemoStore {
  if (global.__queuekeeperDemoStoreCache) {
    return global.__queuekeeperDemoStoreCache;
  }

  let store = createSeededStore();

  if (useFileBackedStore && fs.existsSync(storeFile)) {
    try {
      store = JSON.parse(fs.readFileSync(storeFile, "utf8")) as DemoStore;
    } catch {
      store = createSeededStore();
    }
  } else if (useFileBackedStore) {
    ensureStoreFile(store);
  }

  global.__queuekeeperDemoStoreCache = store;
  return store;
}

function saveStore(store: DemoStore) {
  global.__queuekeeperDemoStoreCache = store;
  ensureStoreFile(store);
}

function getStageView(stage: DemoStageRecord): QueueStageView {
  const status = stage.released
    ? "released"
    : stage.proofHash
      ? "awaiting-release"
      : "pending-proof";

  return {
    key: stage.key,
    label: queueStageLabels[stage.key],
    amount: formatUsd(stage.amountUsd),
    released: stage.released,
    status,
    proofHash: stage.proofHash ?? "pending",
    proofSubmittedAt: stage.proofSubmittedAt,
    releasedAt: stage.releasedAt,
    timestamp: stage.releasedAt
      ? `Released ${stage.releasedAt}`
      : stage.proofSubmittedAt
        ? `Proof submitted ${stage.proofSubmittedAt}`
        : "No proof submitted yet",
    proofTxHash: stage.proofTxHash,
    releaseTxHash: stage.releaseTxHash
  };
}

function getCurrentStageDescription(job: DemoJobRecord): string {
  if (job.status === "completed") {
    return "Completion released. Buyer and runner both have the final receipt trail.";
  }

  if (job.status === "posted") {
    return "Escrow funded in the demo store and waiting for verified runner acceptance.";
  }

  const completionStage = job.stages.find((stage) => stage.key === "completion");
  if (completionStage?.proofHash && !completionStage.released) {
    return "Completion proof submitted. Buyer review required before final payout release.";
  }

  const heartbeatStage = job.stages.find((stage) => stage.key === "heartbeat");
  if (heartbeatStage?.proofHash && !heartbeatStage.released) {
    return "Heartbeat proof submitted. Buyer can release the single-heartbeat MVP payout.";
  }

  const arrivalStage = job.stages.find((stage) => stage.key === "arrival");
  if (arrivalStage?.proofHash && !arrivalStage.released) {
    return "Arrival proof submitted. Buyer review required.";
  }

  const scoutStage = job.stages.find((stage) => stage.key === "scout");
  if (scoutStage?.proofHash && !scoutStage.released) {
    return "Scout proof submitted. Buyer review required before the next stage.";
  }

  if (job.status === "accepted") {
    return "Runner accepted the job. Exact location is visible only to the verified accepted runner response.";
  }

  return "Awaiting runner action.";
}

function getJobStatus(job: DemoJobRecord): QueueJobStatus {
  const completionStage = job.stages.find((stage) => stage.key === "completion");
  const arrivalStage = job.stages.find((stage) => stage.key === "arrival");

  if (new Date(job.expiresAt).getTime() < Date.now() && job.status !== "completed") {
    return "expired";
  }
  if (completionStage?.released) {
    return "completed";
  }
  if (arrivalStage?.released || job.stages.some((stage) => stage.key === "heartbeat" && (stage.proofHash || stage.released))) {
    return "holding";
  }
  if (job.acceptedRunnerAddress) {
    return "accepted";
  }
  return "posted";
}

function getPayoutSummary(job: DemoJobRecord): string {
  const totalReleased = job.stages
    .filter((stage) => stage.released)
    .reduce((sum, stage) => sum + stage.amountUsd, 0);
  const totalReserved = job.stages.reduce((sum, stage) => sum + stage.amountUsd, 0);

  return `${formatUsd(totalReleased)} released · ${formatUsd(totalReserved - totalReleased)} pending`;
}

function getExactLocationHint(job: DemoJobRecord, viewer: QueueViewerRole, revealToken?: string): {
  hint: string;
  visibleExactLocation: string | null;
} {
  if (viewer === "buyer") {
    return {
      hint: job.exactLocation,
      visibleExactLocation: job.exactLocation
    };
  }

  if (viewer === "runner" && revealToken && revealToken === job.revealToken) {
    return {
      hint: job.exactLocation,
      visibleExactLocation: job.exactLocation
    };
  }

  return {
    hint: job.acceptedRunnerAddress
      ? "Exact location hidden from everyone except the verified accepted runner response token."
      : "Exact location hidden until verified acceptance succeeds.",
    visibleExactLocation: null
  };
}

function toQueueJobView(job: DemoJobRecord, viewer: QueueViewerRole, revealToken?: string): QueueJobView {
  const exactLocation = getExactLocationHint(job, viewer, revealToken);
  const status = getJobStatus(job);

  return {
    id: job.id,
    title: job.title,
    coarseArea: job.coarseArea,
    exactLocationHint: exactLocation.hint,
    exactLocationVisibleToViewer: exactLocation.visibleExactLocation,
    status,
    maxSpend: formatUsd(job.maxSpendUsd),
    delegationSummary: `${job.delegation.mode} · ${formatUsd(job.delegation.spendCapUsd)} cap`,
    runnerVerified: job.runnerVerification.status === "verified",
    runnerVerification: job.runnerVerification,
    currentStage: getCurrentStageDescription({ ...job, status }),
    keptPrivate: job.keptPrivate,
    payoutSummary: getPayoutSummary(job),
    stages: job.stages.map(getStageView),
    policy: {
      mode: job.delegation.mode,
      status: job.delegation.status,
      spendCap: formatUsd(job.delegation.spendCapUsd),
      expiry: job.delegation.expiresAt,
      approvedToken: job.delegation.approvedToken,
      approvedContract: job.delegation.approvedContract,
      jobId: job.id,
      notes: job.delegation.notes,
      lastResult: job.delegation.lastResult,
      lastUpdatedAt: job.delegation.lastUpdatedAt,
      requestor: job.delegation.requestor
    },
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
    expiresAt: job.expiresAt,
    selectedRunnerAddress: job.selectedRunnerAddress,
    acceptedRunnerAddress: job.acceptedRunnerAddress ?? undefined,
    plannerPreview: job.plannerPreview,
    explorerLinks: buildContractExplorerLinks()
  };
}

function withJobUpdate(jobId: string, updater: (job: DemoJobRecord) => DemoJobRecord): DemoJobRecord {
  const store = loadStore();
  const jobIndex = store.jobs.findIndex((job) => job.id === jobId);

  if (jobIndex === -1) {
    throw new Error(`Job ${jobId} not found.`);
  }

  const updatedJob = updater(store.jobs[jobIndex]);
  const nextStore = {
    ...store,
    jobs: store.jobs.map((job, index) => index === jobIndex ? updatedJob : job)
  };
  saveStore(nextStore);
  return updatedJob;
}

function getRequiredStage(job: DemoJobRecord, stageKey: QueueStageKey): DemoStageRecord {
  const stage = job.stages.find((entry) => entry.key === stageKey);
  if (!stage) {
    throw new Error(`Missing stage ${stageKey}.`);
  }
  return stage;
}

function ensureReleaseOrder(job: DemoJobRecord, stageKey: QueueStageKey) {
  const stageIndex = queueStageOrder.indexOf(stageKey);
  if (stageIndex === -1) {
    throw new Error(`Unknown stage ${stageKey}.`);
  }

  const previousStages = queueStageOrder.slice(0, stageIndex);
  const missingPreviousRelease = previousStages.find((previousKey) => !getRequiredStage(job, previousKey).released);
  if (missingPreviousRelease) {
    throw new Error(`Release ${queueStageLabels[missingPreviousRelease]} before ${queueStageLabels[stageKey]}.`);
  }
}

export function getDefaultBuyerDraft(): BuyerJobFormInput {
  return getDefaultBuyerFormInput();
}

export function listDemoJobs(viewer: QueueViewerRole = "public"): QueueJobView[] {
  return [...loadStore().jobs]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((job) => toQueueJobView(job, viewer));
}

export function getDemoJob(jobId: string, viewer: QueueViewerRole = "public", revealToken?: string): QueueJobView | null {
  const job = loadStore().jobs.find((entry) => entry.id === jobId);
  return job ? toQueueJobView(job, viewer, revealToken) : null;
}

export function upsertDemoJob(form: BuyerJobFormInput): QueueJobView {
  const store = loadStore();
  const existing = form.id ? store.jobs.find((job) => job.id === form.id) : undefined;
  const nextJob = createDemoJobRecord(form, existing);

  const nextStore = existing
    ? {
        ...store,
        jobs: store.jobs.map((job) => job.id === existing.id ? nextJob : job)
      }
    : {
        ...store,
        jobs: [nextJob, ...store.jobs]
      };

  saveStore(nextStore);
  return toQueueJobView(nextJob, "buyer");
}

export function acceptDemoJob(jobId: string, runnerAddress: string, verification: SelfVerificationResult, txHash?: string): AcceptJobResponse {
  const acceptedJob = withJobUpdate(jobId, (job) => {
    if (job.acceptedRunnerAddress) {
      throw new Error("Job already accepted.");
    }

    const revealToken = crypto.randomUUID();
    return {
      ...job,
      acceptedRunnerAddress: runnerAddress,
      revealToken,
      status: "accepted",
      updatedAt: nowIso(),
      runnerVerification: {
        status: "verified",
        provider: verification.provider,
        reference: verification.reference,
        verifiedAt: nowIso()
      },
      stages: job.stages,
      delegation: {
        ...job.delegation,
        lastResult: txHash
          ? `Runner accepted in the demo store and a live accept tx was captured: ${txHash}`
          : job.delegation.lastResult
      }
    };
  });

  if (!acceptedJob.revealToken) {
    throw new Error("Acceptance token missing.");
  }

  return {
    accepted: true,
    jobId,
    runnerAddress,
    job: toQueueJobView(acceptedJob, "runner", acceptedJob.revealToken),
    acceptanceRecord: {
      verificationReference: verification.reference,
      verificationProvider: verification.provider,
      exactLocationRevealAllowed: true,
      revealToken: acceptedJob.revealToken
    },
    exactLocation: acceptedJob.exactLocation
  };
}

export function submitDemoProof(jobId: string, request: SubmitProofRequest, viewer: QueueViewerRole = "runner", revealToken?: string): QueueJobView {
  const updatedJob = withJobUpdate(jobId, (job) => {
    if (!job.acceptedRunnerAddress) {
      throw new Error("Runner must accept before submitting proofs.");
    }

    const nextStages = job.stages.map((stage) => stage.key === request.stageKey
      ? {
          ...stage,
          proofHash: request.proofHash,
          proofSubmittedAt: nowIso(),
          proofTxHash: request.txHash ?? stage.proofTxHash
        }
      : stage);

    return {
      ...job,
      updatedAt: nowIso(),
      stages: nextStages
    };
  });

  return toQueueJobView(updatedJob, viewer, revealToken);
}

export function releaseDemoStage(jobId: string, request: ReleaseStageRequest): QueueJobView {
  const updatedJob = withJobUpdate(jobId, (job) => {
    const stage = getRequiredStage(job, request.stageKey);
    if (!job.acceptedRunnerAddress) {
      throw new Error("Runner must accept before releases can start.");
    }
    if (!stage.proofHash) {
      throw new Error(`${queueStageLabels[request.stageKey]} proof is required before release.`);
    }
    if (stage.released) {
      throw new Error(`${queueStageLabels[request.stageKey]} is already released.`);
    }

    ensureReleaseOrder(job, request.stageKey);

    const nextStages = job.stages.map((entry) => entry.key === request.stageKey
      ? {
          ...entry,
          released: true,
          releasedAt: nowIso(),
          releaseTxHash: request.txHash ?? entry.releaseTxHash
        }
      : entry);

    return {
      ...job,
      status: request.stageKey === "completion" ? "completed" : "holding",
      updatedAt: nowIso(),
      stages: nextStages
    };
  });

  return toQueueJobView(updatedJob, "buyer");
}

export function updateDemoDelegation(jobId: string, request: DelegationUpdateRequest): QueueJobView {
  const updatedJob = withJobUpdate(jobId, (job) => ({
    ...job,
    updatedAt: nowIso(),
    delegation: {
      ...job.delegation,
      mode: request.status === "granted" ? request.mode : "mock-bounded-policy",
      status: request.status,
      requestor: request.requestor ?? null,
      lastResult: request.result,
      lastUpdatedAt: nowIso()
    }
  }));

  return toQueueJobView(updatedJob, "buyer");
}

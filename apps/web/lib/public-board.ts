import { getQueueKeeperCore } from "@queuekeeper/core";
import type { QueueJobView } from "@queuekeeper/shared";
import { headers } from "next/headers";

export type PublicBoardSnapshot = {
  tasks: QueueJobView[];
  source: "live" | "demo-fallback";
  reason: string | null;
};

function resolveOrigin(host: string | null, forwardedProto: string | null) {
  if (!host) return "https://queuekeeper.xyz";
  const proto = forwardedProto ?? (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${proto}://${host}`;
}

function buildDemoFallbackTasks(): QueueJobView[] {
  const createdAt = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 90 * 60_000).toISOString();

  return [
    {
      id: "demo-board-pool",
      mode: "VERIFIED_POOL",
      principalMode: "HUMAN",
      publicListingStatus: "visible",
      publicListingReason: "Demo fallback: seeded public scout task shown because no live public tasks are posted.",
      title: "Cafe opening queue scout",
      coarseArea: "Mission / Valencia",
      timingWindow: "This afternoon",
      exactLocationHint: "Exact destination is encrypted and only revealed after verified acceptance.",
      exactLocationVisibleToViewer: null,
      status: "posted",
      maxSpend: "18.00 cUSD",
      delegationSummary: "mock-bounded-policy · 18.00 cUSD",
      runnerVerified: false,
      runnerVerification: {
        status: "pending",
        provider: "mock-self",
        reference: "pending",
        verifiedAt: null
      },
      currentStage: "Scout is the next runner action.",
      keptPrivate: ["Exact destination", "Hidden notes", "Fallback instructions", "Proof media", "Handoff secret"],
      payoutSummary: "0.00 cUSD released · 3.00 cUSD remaining",
      stages: [],
      policy: {
        mode: "mock-bounded-policy",
        status: "not-requested",
        spendCap: "18.00 cUSD",
        expiry: expiresAt,
        approvedToken: "0xEeA30fA689535f7FB45a8A91045E3b1d1c54A3d6",
        approvedContract: "0xb566298bf1c1afa55f0edc514b2f9d990c82f98c",
        jobId: "demo-board-pool",
        notes: [
          "Demo fallback keeps the public board explorable when no live tasks are posted.",
          "Acceptance remains verification-gated.",
          "Exact destination stays hidden until acceptance."
        ],
        lastResult: "Demo fallback board active.",
        lastUpdatedAt: createdAt,
        requestor: null
      },
      createdAt,
      updatedAt: createdAt,
      expiresAt,
      plannerPreview: {
        action: "scout-only",
        reason: "Demo fallback keeps the public board usable."
      },
      plannerProvider: "demo-fallback",
      procurementThesis: "Pay only for the next verified increment, never for the whole promise.",
      agentDecisionSummary: null,
      disputeStatus: "none",
      heartbeatIntervalSeconds: 180,
      heartbeatCount: 2,
      reviewWindowsSummary: "180s heartbeat cadence with buyer review + timeout auto-release",
      explorerLinks: []
    },
    {
      id: "demo-board-dispatch",
      mode: "DIRECT_DISPATCH",
      principalMode: "AGENT",
      publicListingStatus: "visible",
      publicListingReason: "Demo fallback: seeded directed-dispatch task shown because no live public tasks are posted.",
      title: "Conference merch queue hold",
      coarseArea: "Moscone West / Howard St",
      timingWindow: "Today, next 2 hours",
      exactLocationHint: "Exact destination is encrypted and only revealed after verified acceptance.",
      exactLocationVisibleToViewer: null,
      status: "posted",
      maxSpend: "35.00 cUSD",
      delegationSummary: "mock-bounded-policy · 35.00 cUSD",
      runnerVerified: false,
      runnerVerification: {
        status: "pending",
        provider: "mock-self",
        reference: "pending",
        verifiedAt: null
      },
      currentStage: "Scout is the next runner action.",
      keptPrivate: ["Exact destination", "Hidden notes", "Fallback instructions", "Proof media", "Handoff secret"],
      payoutSummary: "0.00 cUSD released · 40.00 cUSD remaining",
      stages: [],
      policy: {
        mode: "mock-bounded-policy",
        status: "not-requested",
        spendCap: "35.00 cUSD",
        expiry: expiresAt,
        approvedToken: "0xEeA30fA689535f7FB45a8A91045E3b1d1c54A3d6",
        approvedContract: "0xb566298bf1c1afa55f0edc514b2f9d990c82f98c",
        jobId: "demo-board-dispatch",
        notes: [
          "Demo fallback keeps the public board explorable when no live tasks are posted.",
          "Selected runner stays a preference until someone accepts.",
          "Exact destination stays hidden until acceptance."
        ],
        lastResult: "Demo fallback board active.",
        lastUpdatedAt: createdAt,
        requestor: null
      },
      createdAt,
      updatedAt: createdAt,
      expiresAt,
      plannerPreview: {
        action: "scout-then-hold",
        reason: "Demo fallback shows the directed-dispatch path too."
      },
      plannerProvider: "demo-fallback",
      procurementThesis: "Pay only for the next verified increment, never for the whole promise.",
      agentDecisionSummary: null,
      disputeStatus: "none",
      heartbeatIntervalSeconds: 300,
      heartbeatCount: 3,
      reviewWindowsSummary: "300s heartbeat cadence with buyer review + timeout auto-release",
      explorerLinks: []
    }
  ];
}

export async function loadPublicTasks(): Promise<PublicBoardSnapshot> {
  try {
    const requestHeaders = await headers();
    const origin = resolveOrigin(
      requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host"),
      requestHeaders.get("x-forwarded-proto")
    );

    const response = await fetch(`${origin}/api/v1/tasks?viewer=public`, {
      cache: "no-store"
    });
    if (response.ok) {
      const json = await response.json() as { tasks?: QueueJobView[] };
      if (Array.isArray(json.tasks) && json.tasks.length > 0) {
        return {
          tasks: json.tasks,
          source: "live",
          reason: null
        };
      }
    }
  } catch {
    return {
      tasks: buildDemoFallbackTasks(),
      source: "demo-fallback",
      reason: "Live public board is unavailable, so QueueKeeper is showing seeded demo tasks."
    };
  }

  const tasks = (await getQueueKeeperCore()).listTasks("public").tasks;
  if (tasks.length > 0) {
    return {
      tasks,
      source: "live",
      reason: null
    };
  }

  return {
    tasks: buildDemoFallbackTasks(),
    source: "demo-fallback",
    reason: "No live public tasks are posted right now, so QueueKeeper is showing seeded demo tasks."
  };
}

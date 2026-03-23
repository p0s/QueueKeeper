import { RunnerJobDemo } from "../../../components/runner-job-demo";
import { getQueueKeeperCore } from "@queuekeeper/core";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function RunnerJobPage({
  params,
  searchParams
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ revealToken?: string }>;
}) {
  const { jobId } = await params;
  const { revealToken } = await searchParams;
  const job = await (async () => {
    try {
      const core = await getQueueKeeperCore();
      return core.getTask(jobId, revealToken ? "runner" : "public", {
        revealToken
      });
    } catch {
      notFound();
    }
  })();

  return (
    <RunnerJobDemo
      initialJob={job}
      initialRevealToken={revealToken}
      jobId={jobId}
      liveSelfMode={
        process.env.QUEUEKEEPER_REQUIRE_LIVE_SELF === "true"
        || process.env.NEXT_PUBLIC_QUEUEKEEPER_REQUIRE_LIVE_SELF === "true"
      }
    />
  );
}

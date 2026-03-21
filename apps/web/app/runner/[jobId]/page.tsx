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
  let job;
  try {
    const core = getQueueKeeperCore();
    job = core.getJob(jobId, revealToken ? "runner" : "public", {
      revealToken
    });
  } catch {
    notFound();
  }

  return (
    <RunnerJobDemo
      initialJob={job}
      initialRevealToken={revealToken}
      jobId={jobId}
      liveSelfMode={process.env.SELF_MODE === "live"}
    />
  );
}

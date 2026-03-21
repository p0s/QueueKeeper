import { RunnerJobDemo } from "../../../components/runner-job-demo";
import { getDemoJob } from "../../../lib/demo-store";
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
  const job = getDemoJob(jobId, "runner", revealToken);

  if (!job) {
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

import { RunnerJobDemo } from "../../../components/runner-job-demo";
import { sampleJob } from "../../../lib/sample-data";

export default async function RunnerJobPage({ params }: { params: Promise<{ jobId: string }> }) {
  const { jobId } = await params;
  return <RunnerJobDemo initialJob={sampleJob} jobId={jobId} />;
}

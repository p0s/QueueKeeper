import { BuyerDemo } from "../../components/buyer-demo";
import { getQueueKeeperCore } from "@queuekeeper/core";
import { getDefaultBuyerFormInput } from "../../lib/demo-data";

export const dynamic = "force-dynamic";

export default function BuyerPage() {
  const jobs = getQueueKeeperCore().listJobs("public").jobs;
  return <BuyerDemo initialDraft={getDefaultBuyerFormInput()} initialJob={jobs[0] ?? null} />;
}

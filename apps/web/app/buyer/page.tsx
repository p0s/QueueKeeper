import { BuyerDemo } from "../../components/buyer-demo";
import { getDefaultBuyerDraft, listDemoJobs } from "../../lib/demo-store";

export const dynamic = "force-dynamic";

export default function BuyerPage() {
  const jobs = listDemoJobs("buyer");
  return <BuyerDemo initialDraft={getDefaultBuyerDraft()} initialJob={jobs[0] ?? null} />;
}

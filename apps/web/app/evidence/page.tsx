import { getQueueKeeperCore } from "@queuekeeper/core";
import { EvidenceGrid } from "../../components/evidence-grid";

export const dynamic = "force-dynamic";

export default async function EvidencePage() {
  const evidence = (await getQueueKeeperCore()).getEvidence();
  return <EvidenceGrid evidence={evidence} />;
}

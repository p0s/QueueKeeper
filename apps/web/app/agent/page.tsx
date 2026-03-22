import { TaskStudio } from "../../components/task-studio";
import { getAgentIdentityManifest } from "../../lib/agent-manifest";
import { getDefaultBuyerFormInput } from "../../lib/demo-data";

export const dynamic = "force-dynamic";

export default function AgentModePage() {
  return (
    <TaskStudio
      agentIdentity={getAgentIdentityManifest()}
      initialDraft={{ ...getDefaultBuyerFormInput(), principalMode: "AGENT" }}
      principalMode="AGENT"
    />
  );
}

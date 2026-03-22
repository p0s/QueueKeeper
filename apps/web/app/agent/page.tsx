import { TaskStudio } from "../../components/task-studio";
import { getDefaultBuyerFormInput } from "../../lib/demo-data";

export const dynamic = "force-dynamic";

export default function AgentModePage() {
  return (
    <TaskStudio
      initialDraft={{ ...getDefaultBuyerFormInput(), principalMode: "AGENT" }}
      principalMode="AGENT"
    />
  );
}

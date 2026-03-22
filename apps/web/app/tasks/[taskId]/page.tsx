import { getQueueKeeperCore } from "@queuekeeper/core";
import { notFound } from "next/navigation";
import { TaskCommandCenter } from "../../../components/task-command-center";

export const dynamic = "force-dynamic";

export default async function TaskCommandCenterPage({
  params
}: {
  params: Promise<{ taskId: string }>;
}) {
  const { taskId } = await params;

  try {
    const task = (await getQueueKeeperCore()).getTask(taskId, "public");
    return <TaskCommandCenter initialTask={task} taskId={taskId} />;
  } catch {
    notFound();
  }
}

"use client";

import { useEffect, useState } from "react";
import type { QueueJobView } from "@queuekeeper/shared";
import { TaskFeedBoard } from "./task-feed-board";

export function PublicTaskFeed({ initialTasks }: { initialTasks: QueueJobView[] }) {
  const [tasks, setTasks] = useState(initialTasks);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/tasks?viewer=public", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) return null;
        return await response.json() as { tasks?: QueueJobView[] };
      })
      .then((json) => {
        if (active && json?.tasks) {
          setTasks(json.tasks);
        }
      })
      .catch(() => {
        // Keep the server-rendered snapshot if the refresh fails.
      });

    return () => {
      active = false;
    };
  }, []);

  return <TaskFeedBoard tasks={tasks} />;
}

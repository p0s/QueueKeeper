"use client";

import { useEffect, useState } from "react";
import type { QueueJobView } from "@queuekeeper/shared";
import { TaskFeedBoard } from "./task-feed-board";

export function PublicTaskFeed({ initialTasks }: { initialTasks: QueueJobView[] }) {
  const [tasks, setTasks] = useState(initialTasks);

  useEffect(() => {
    let active = true;
    async function refreshTasks() {
      try {
        const response = await fetch("/api/v1/tasks?viewer=public", { cache: "no-store" });
        if (!response.ok) return;
        const json = await response.json() as { tasks?: QueueJobView[] };
        if (active && json.tasks) {
          setTasks(json.tasks);
        }
      } catch {
        // Keep the current snapshot if refresh fails.
      }
    }

    void refreshTasks();
    const interval = window.setInterval(() => {
      void refreshTasks();
    }, 4000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, []);

  return <TaskFeedBoard tasks={tasks} />;
}

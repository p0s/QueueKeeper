"use client";

import { useEffect, useState } from "react";
import type { QueueJobView } from "@queuekeeper/shared";
import { TaskFeedBoard } from "./task-feed-board";

export function PublicTaskFeed({ initialTasks }: { initialTasks: QueueJobView[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [status, setStatus] = useState<"syncing" | "ready" | "error">(initialTasks.length > 0 ? "ready" : "syncing");

  useEffect(() => {
    let active = true;
    async function refreshTasks() {
      try {
        const response = await fetch("/api/v1/tasks?viewer=public", { cache: "no-store" });
        if (!response.ok) {
          if (active) setStatus("error");
          return;
        }
        const json = await response.json() as { tasks?: QueueJobView[] };
        if (active && json.tasks) {
          setTasks(json.tasks);
          setStatus("ready");
        }
      } catch {
        if (active) setStatus("error");
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

  return (
    <div className="stack-tight">
      <div className="action-row">
        <span className="eyebrow">Live board sync</span>
        <span className={`chip ${status === "error" ? "danger" : status === "ready" ? "success" : "info"}`}>
          {status === "error" ? "sync failed" : `${tasks.length} task${tasks.length === 1 ? "" : "s"}`}
        </span>
      </div>
      <TaskFeedBoard tasks={tasks} />
    </div>
  );
}

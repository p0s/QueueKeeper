"use client";

import { useEffect, useState } from "react";
import type { QueueJobView } from "@queuekeeper/shared";
import type { PublicBoardSnapshot } from "../lib/public-board";
import { TaskFeedBoard } from "./task-feed-board";

export function PublicTaskFeed({ initialBoard }: { initialBoard: PublicBoardSnapshot }) {
  const [tasks, setTasks] = useState(initialBoard.tasks);
  const [source, setSource] = useState<PublicBoardSnapshot["source"]>(initialBoard.source);
  const [reason, setReason] = useState(initialBoard.reason);
  const [status, setStatus] = useState<"syncing" | "ready" | "error">(initialBoard.tasks.length > 0 ? "ready" : "syncing");
  const fallbackTasks = initialBoard.tasks;
  const fallbackSource = initialBoard.source;
  const fallbackReason = initialBoard.reason;

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
        if (active && Array.isArray(json.tasks)) {
          if (json.tasks.length > 0) {
            setTasks(json.tasks);
            setSource("live");
            setReason(null);
          } else if (fallbackSource === "demo-fallback") {
            setTasks(fallbackTasks);
            setSource("demo-fallback");
            setReason(fallbackReason);
          } else {
            setTasks([]);
            setSource("live");
            setReason(null);
          }
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
  }, [fallbackReason, fallbackSource, fallbackTasks]);

  return (
    <div className="stack-tight">
      <div className="action-row">
        <span className="eyebrow">{source === "demo-fallback" ? "Demo board fallback" : "Live board sync"}</span>
        <span className={`chip ${status === "error" ? "danger" : status === "ready" ? "success" : "info"}`}>
          {status === "error"
            ? "sync failed"
            : source === "demo-fallback"
              ? "seeded demo"
              : `${tasks.length} task${tasks.length === 1 ? "" : "s"}`}
        </span>
      </div>
      {reason ? <p className="muted">{reason}</p> : null}
      <TaskFeedBoard source={source} tasks={tasks} />
    </div>
  );
}

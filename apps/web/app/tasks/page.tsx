import { headers } from "next/headers";
import type { QueueJobView } from "@queuekeeper/shared";
import { TaskFeedBoard } from "../../components/task-feed-board";

export const dynamic = "force-dynamic";

async function fetchPublicTasks(): Promise<QueueJobView[]> {
  const requestHeaders = await headers();
  const host = requestHeaders.get("host") ?? "127.0.0.1:3000";
  const protocol = requestHeaders.get("x-forwarded-proto")
    ?? (host.startsWith("127.0.0.1") || host.startsWith("localhost") ? "http" : "https");
  const response = await fetch(`${protocol}://${host}/api/v1/tasks?viewer=public`, {
    cache: "no-store"
  });
  if (!response.ok) {
    return [];
  }
  const json = (await response.json()) as { tasks?: QueueJobView[] };
  return json.tasks ?? [];
}

export default async function TaskFeedPage() {
  const tasks = await fetchPublicTasks();

  return (
    <main className="container job-list-shell fade-in">
      <section className="card hero-card">
        <span className="badge-pill">Earn with QueueKeeper</span>
        <h1 className="hero-headline" style={{ maxWidth: "12ch", fontSize: "clamp(2.7rem, 4.5vw, 4.3rem)" }}>
          Earn by completing verified steps.
        </h1>
        <p className="hero-copy muted">
          Accept a redacted task, verify first, unlock the destination after acceptance, and get paid as each proof-backed step is completed.
        </p>
      </section>
      <TaskFeedBoard tasks={tasks} />
    </main>
  );
}

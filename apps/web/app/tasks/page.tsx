import { getQueueKeeperCore } from "@queuekeeper/core";
import { TaskFeedBoard } from "../../components/task-feed-board";

export const dynamic = "force-dynamic";

export default async function TaskFeedPage() {
  const tasks = (await getQueueKeeperCore()).listTasks("public").tasks;

  return (
    <main className="container job-list-shell fade-in">
      <section className="card hero-card">
        <span className="badge-pill">Public task feed</span>
        <h1 className="hero-headline" style={{ maxWidth: "12ch", fontSize: "clamp(2.7rem, 4.5vw, 4.3rem)" }}>
          Public tasks, private intent.
        </h1>
        <p className="hero-copy muted">
          Principals post redacted scout-and-hold tasks, runners verify first, and the exact destination only unlocks after the acceptance gate passes.
        </p>
      </section>
      <TaskFeedBoard tasks={tasks} />
    </main>
  );
}

import { PublicTaskFeed } from "../../components/public-task-feed";
import { loadPublicTasks } from "../../lib/public-board";

export const dynamic = "force-dynamic";

export default async function TaskFeedPage() {
  const tasks = await loadPublicTasks();

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
      <PublicTaskFeed initialTasks={tasks} />
    </main>
  );
}

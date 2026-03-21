import type { ExplorerLinkView } from "@queuekeeper/shared";

export function ExplorerPanel({ links }: { links: ExplorerLinkView[] }) {
  return (
    <section className="card">
      <h3>Explorer links</h3>
      <p className="muted" style={{ marginBottom: 12 }}>
        Contract links are always available. Captured live transaction links appear here when a wallet-backed write succeeds.
      </p>
      <div className="grid explorer-grid">
        {links.map((link) => (
          <a
            key={`${link.kind}-${link.href}`}
            className="explorer-link"
            href={link.href}
            rel="noreferrer"
            target="_blank"
          >
            <strong>{link.label}</strong>
            <span className="muted">{link.kind === "tx" ? "Transaction" : "Contract"}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

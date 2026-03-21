import type { ExplorerLinkView } from "@queuekeeper/shared";

export function ExplorerPanel({ links }: { links: ExplorerLinkView[] }) {
  const txLinks = links.filter((link) => link.kind === "tx");
  const contractLinks = links.filter((link) => link.kind === "contract");

  if (links.length <= 1 && txLinks.length === 0) {
    return null;
  }

  return (
    <section className="card">
      <span className="eyebrow">Explorer</span>
      <h3 className="section-title">Chain receipts</h3>
      <p className="muted section-copy" style={{ marginBottom: 12 }}>
        Contract links stay available in the background. Live transaction receipts only appear here when a wallet-backed write succeeds.
      </p>
      <div className="grid explorer-grid">
        {[...txLinks, ...contractLinks].map((link) => (
          <a
            key={`${link.kind}-${link.href}`}
            className="explorer-link"
            href={link.href}
            rel="noreferrer"
            target="_blank"
          >
            <strong>{link.label}</strong>
            <span className={`chip ${link.kind === "tx" ? "success" : "info"}`}>{link.kind === "tx" ? "Transaction receipt" : "Contract"}</span>
          </a>
        ))}
      </div>
    </section>
  );
}

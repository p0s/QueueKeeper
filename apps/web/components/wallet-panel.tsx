export function WalletPanel({ connected = false, funded = false }: { connected?: boolean; funded?: boolean }) {
  return (
    <section className="card">
      <h3>Wallet connect + funding</h3>
      <p className="muted">
        viem + wagmi are installed for the actual onchain hookup. This MVP keeps the wallet/funding surface real enough for demo flow while marking where live Celo transactions plug in.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        <div className="badge">Wallet: {connected ? "connected" : "not connected"}</div>
        <div className="badge">Escrow: {funded ? "funded" : "not funded"}</div>
      </div>
      <p className="muted" style={{ marginTop: 12 }}>
        Live hook point: replace the demo funding action with wagmi wallet connect + viem writeContract against QueueKeeperEscrow on Celo.
      </p>
    </section>
  );
}

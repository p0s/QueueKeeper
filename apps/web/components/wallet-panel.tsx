export function WalletPanel() {
  return (
    <section className="card">
      <h3>Wallet connect + funding</h3>
      <p className="muted">
        viem + wagmi are installed for the actual onchain hookup. This MVP keeps the UI and data model ready without forcing a half-baked wallet integration.
      </p>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
        <button className="button">Connect MetaMask</button>
        <button className="button">Fund escrow</button>
      </div>
    </section>
  );
}

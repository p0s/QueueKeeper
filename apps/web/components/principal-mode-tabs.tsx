import type { PrincipalMode } from "@queuekeeper/shared";

export function PrincipalModeTabs({ activeMode }: { activeMode: PrincipalMode }) {
  return (
    <nav aria-label="Principal mode" className="mode-toggle mode-toggle-static">
      <a className={`mode-toggle-button ${activeMode === "HUMAN" ? "active" : ""}`} href="/human">
        I&apos;m a Human
      </a>
      <a className={`mode-toggle-button ${activeMode === "AGENT" ? "active" : ""}`} href="/agent">
        I&apos;m an Agent
      </a>
    </nav>
  );
}

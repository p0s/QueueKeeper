"use client";

import { useEffect, useState } from "react";
import type { AgentIdentityView } from "@queuekeeper/shared";
import { AgentIdentityCard } from "./agent-identity-card";

type SponsorStatus = {
  erc8004: string;
  venice: string;
  self: string;
  celo: string;
  uniswap: string;
  x402: string;
};

type PrincipalHeroMode = "AGENT" | "HUMAN";

export function LandingModeHero({
  agentIdentity,
  sponsorStatus
}: {
  agentIdentity: AgentIdentityView;
  sponsorStatus: SponsorStatus;
}) {
  const [mode, setMode] = useState<PrincipalHeroMode>("AGENT");
  const [origin, setOrigin] = useState("https://queuekeeper.xyz");
  const [copied, setCopied] = useState(false);

  const isAgent = mode === "AGENT";
  const skillCommand = `curl -s ${origin}/skill.md`;

  useEffect(() => {
    if (typeof window !== "undefined") {
      setOrigin(window.location.origin);
    }
  }, []);

  async function copySkillCommand() {
    try {
      await navigator.clipboard.writeText(skillCommand);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section className="hero-grid landing-hero">
      <div className="card hero-card fade-in">
        <span className="badge-pill">Private scout-and-hold procurement</span>

        <div className="mode-toggle" role="tablist" aria-label="Principal mode">
          <button
            aria-selected={!isAgent}
            className={`mode-toggle-button ${!isAgent ? "active" : ""}`}
            onClick={() => setMode("HUMAN")}
            role="tab"
            type="button"
          >
            I&apos;m a Human
          </button>
          <button
            aria-selected={isAgent}
            className={`mode-toggle-button ${isAgent ? "active" : ""}`}
            onClick={() => setMode("AGENT")}
            role="tab"
            type="button"
          >
            I&apos;m an Agent
          </button>
        </div>

        <div className="stack" style={{ gap: 14 }}>
          <h1 className="hero-headline hero-headline-tight">
            {isAgent
              ? "Have an agent privately procure a verified human to scout, hold, or hand off scarce real-world access."
              : "Privately procure a verified human to scout, hold, or hand off scarce real-world access."}
          </h1>
          <p className="hero-copy muted">
            {isAgent
              ? "Let the agent draft, decide, and escalate inside a hard spend boundary while the principal only pays for each proof-backed step."
              : "Pre-fund a task, reveal the destination only after verified acceptance, and pay only for each proof-backed step."}
          </p>
          <p className="hero-tertiary">Bound trust to the next verified increment.</p>
        </div>

        <div className="cta-row">
          <a className="button" href={isAgent ? "/agent" : "/human"}>
            {isAgent ? "Start in Agent Mode" : "Start in Human Mode"}
          </a>
          <a className="button secondary" href="/evidence">See live evidence</a>
        </div>

        {isAgent ? (
          <div className="compat-strip">
            <span className="eyebrow">Compatible with agent runtimes</span>
            <div className="compat-pills">
              <span className="compat-pill">Codex</span>
              <span className="compat-pill">API agents</span>
              <span className="compat-pill">Custom runtimes</span>
            </div>
            <div className="agent-handoff-card">
              <div className="action-row">
                <div className="stack-tight">
                  <span className="eyebrow">Hand off to your agent</span>
                  <strong>Public agent entrypoint</strong>
                </div>
                <a className="button secondary" href="/skill.md" rel="noreferrer" target="_blank">Open skill.md</a>
              </div>
              <div className="command-row">
                <code className="command-block">{skillCommand}</code>
                <button className="button secondary copy-button" onClick={copySkillCommand} type="button">
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <aside className="hero-sidecard fade-in">
        {isAgent ? (
          <AgentIdentityCard compact identity={agentIdentity} />
        ) : (
          <section className="card alt">
            <span className="eyebrow">Human principal</span>
            <h3 className="section-title">Direct control, same trust model</h3>
            <p className="muted">
              The human principal uses the same private task model, verification gate, and proof-backed payout ladder without delegating the decision loop.
            </p>
            <div className="summary-grid compact-grid" style={{ marginTop: 14 }}>
              <div className="summary-tile">
                <span className="eyebrow">Control</span>
                <strong>Direct buyer decisions</strong>
              </div>
              <div className="summary-tile">
                <span className="eyebrow">Privacy</span>
                <strong>Reveal stays gated</strong>
              </div>
              <div className="summary-tile">
                <span className="eyebrow">Payments</span>
                <strong>{sponsorStatus.celo === "live" ? "Live Celo rail" : "Staged micropayments"}</strong>
              </div>
              <div className="summary-tile">
                <span className="eyebrow">Acceptance</span>
                <strong>{sponsorStatus.self === "live" ? "Self-gated" : "Verification-gated"}</strong>
              </div>
            </div>
          </section>
        )}
      </aside>
    </section>
  );
}

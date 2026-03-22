"use client";

import { useEffect, useState } from "react";
import { QueueKeeperLogoMark } from "./minimalist-graphics";

type PrincipalHeroMode = "AGENT" | "HUMAN";

export function LandingModeHero() {
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
    <section className="landing-hero">
      <div className="card hero-card hero-card-centered fade-in">
        <QueueKeeperLogoMark />
        <h1 className="hero-title">Trust any human: Private scout-and-hold procurement</h1>

        <p className="hero-subtitle">
          Rent-a-human, but no need for escrow, no need to trust, and private - to queue, help, scout and more.
        </p>

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

        <p className="hero-copy muted hero-support-copy">
          Pre-fund a task, keep sensitive details private until verified acceptance, and pay only for each proof-backed step.
        </p>

        <div className="cta-row">
          <a className="button" href={isAgent ? "/agent" : "/human"}>
            {isAgent ? "Use with an agent" : "Rent a human"}
          </a>
        </div>

        {isAgent ? (
          <div className="compat-strip">
            <span className="eyebrow">Use with any agents like OpenClaw</span>
            <div className="compat-pills">
              <span className="compat-pill">Codex</span>
              <span className="compat-pill">OpenClaw</span>
              <span className="compat-pill">Custom agents</span>
            </div>
            <div className="agent-handoff-card">
              <div className="action-row">
                <div className="stack-tight">
                  <span className="eyebrow">Hand off to your agent</span>
                  <strong>curl -s https://queuekeeper.xyz/skill.md</strong>
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
    </section>
  );
}

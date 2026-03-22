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
        <span className="badge-pill">QueueKeeper</span>
        <h1 className="hero-title">Hire a human to queue at your favorite restaurant.</h1>

        <p className="hero-subtitle">
          Or do any other task for you. No need for escrow, no need to trust, and private!
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

        <div className="cta-row">
          {!isAgent ? <a className="button" href="/human">Rent a human</a> : null}
        </div>

        {isAgent ? (
          <div className="compat-strip">
            <span className="eyebrow">Use with any agents like OpenClaw</span>
            <div className="agent-handoff-card">
              <div className="action-row">
                <div className="stack-tight">
                  <span className="eyebrow">Hand off to your agent</span>
                </div>
                <a className="button secondary" href="/skill.md" rel="noreferrer" target="_blank">Open skill.md</a>
              </div>
              <div className="command-row">
                <code className="command-block">{skillCommand}</code>
                <button className="button secondary copy-button" onClick={copySkillCommand} type="button">
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <a className="micro-link" href="/agent">Use with an agent</a>
            </div>
          </div>
        ) : null}

      </div>
    </section>
  );
}

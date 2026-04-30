"use client";

import { useEffect, useState } from "react";
import { QueueKeeperLogoMark, QueueLineBackground } from "./minimalist-graphics";

export function LandingModeHero() {
  const [origin, setOrigin] = useState("https://queuekeeper.xyz");
  const [copied, setCopied] = useState(false);
  const [mode, setMode] = useState<"human" | "agent">("agent");

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
        <QueueLineBackground key={mode} mode={mode} />
        <div className="hero-card-content">
          <QueueKeeperLogoMark />
          <span className="badge-pill">QueueKeeper</span>
          <h1 className="hero-title">Hire a human to queue at your favorite restaurant.</h1>

          <p className="hero-subtitle">
            Or do any other task for you. No need for escrow, no need to trust, and private!
          </p>

          <input
            className="mode-toggle-input"
            checked={mode === "human"}
            id="landing-mode-human"
            name="landing-mode"
            type="radio"
            onChange={() => setMode("human")}
          />
          <input
            className="mode-toggle-input"
            checked={mode === "agent"}
            id="landing-mode-agent"
            name="landing-mode"
            type="radio"
            onChange={() => setMode("agent")}
          />

          <fieldset className="mode-toggle">
            <legend className="sr-only">Principal mode</legend>
            <label className={`mode-toggle-button ${mode === "human" ? "active" : ""}`} htmlFor="landing-mode-human">
              I&apos;m a Human
            </label>
            <label className={`mode-toggle-button ${mode === "agent" ? "active" : ""}`} htmlFor="landing-mode-agent">
              I&apos;m an Agent
            </label>
          </fieldset>

          {mode === "human" ? (
            <div className="cta-row hero-human-actions">
              <a className="button" href="/human">Rent a human</a>
              <a className="button secondary" href="/tasks">Accept task</a>
            </div>
          ) : null}

          {mode === "agent" ? (
            <div className="compat-strip hero-agent-actions">
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
      </div>
    </section>
  );
}

import type { CSSProperties } from "react";

export function QueueKeeperLogoMark({
  size = 72
}: {
  size?: number;
}) {
  return (
    <svg
      aria-label="QueueKeeper logo"
      className="logo-mark"
      height={size}
      role="img"
      viewBox="0 0 88 88"
      width={size}
    >
      <rect fill="var(--panel)" height="88" rx="24" stroke="var(--border)" strokeWidth="4" width="88" x="0" y="0" />
      <path
        d="M28 29c0-7.18 5.82-13 13-13h21c7.18 0 13 5.82 13 13v18c0 7.18-5.82 13-13 13H49l17 18"
        fill="none"
        stroke="var(--accent)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="8"
      />
    </svg>
  );
}

type QueueFigure = {
  accent?: boolean;
  bag?: boolean;
  delay: string;
  id: string;
  lead?: boolean;
  phone?: boolean;
  scale: number;
  x: number;
  y: number;
};

const queueFigures: QueueFigure[] = [
  {
    bag: true,
    delay: "0s",
    id: "figure-1",
    scale: 1.12,
    x: 118,
    y: 394
  },
  {
    accent: true,
    delay: "0.55s",
    id: "figure-2",
    phone: true,
    scale: 1.04,
    x: 196,
    y: 392
  },
  {
    bag: true,
    delay: "1.05s",
    id: "figure-3",
    scale: 0.98,
    x: 280,
    y: 388
  },
  {
    delay: "1.6s",
    id: "figure-4",
    scale: 0.93,
    x: 370,
    y: 384
  },
  {
    accent: true,
    delay: "2.1s",
    id: "figure-5",
    scale: 0.89,
    x: 466,
    y: 378
  },
  {
    bag: true,
    delay: "2.7s",
    id: "figure-6",
    scale: 0.83,
    x: 568,
    y: 372
  },
  {
    delay: "3.2s",
    id: "figure-7",
    phone: true,
    scale: 0.79,
    x: 664,
    y: 364
  },
  {
    accent: true,
    bag: true,
    delay: "3.75s",
    id: "figure-8",
    lead: true,
    scale: 0.74,
    x: 744,
    y: 352
  }
];

export function QueueLineBackground() {
  return (
    <div aria-hidden="true" className="hero-queue-background">
      <svg aria-hidden="true" className="hero-queue-svg" viewBox="0 0 920 520">
        <ellipse className="queue-aura" cx="624" cy="404" rx="274" ry="106" />
        <ellipse className="queue-aura queue-aura-soft" cx="318" cy="432" rx="248" ry="82" />

        <path className="queue-guide" d="M104 418c146-34 274-48 390-48 136 0 258 18 384 56" />
        <path className="queue-ground" d="M74 452c152-30 300-42 450-40 142 2 270 18 362 44" />

        <g className="queue-destination">
          <path className="queue-awning" d="M718 242h120l-12 28H730z" />
          <path className="queue-door-outline" d="M742 386v-86c0-35 28-64 64-64s64 29 64 64v86" />
          <path className="queue-door-frame" d="M772 386v-90c0-18 15-33 34-33 18 0 32 15 32 33v90" />
          <rect className="queue-host-stand" height="70" rx="18" width="44" x="690" y="316" />
          <path className="queue-host-stand-detail" d="M700 338h24" />
          <circle className="queue-door-light" cx="806" cy="286" r="6" />
        </g>

        {queueFigures.map((figure) => (
          <g key={figure.id} transform={`translate(${figure.x} ${figure.y}) scale(${figure.scale})`}>
            <g
              className={`queue-figure${figure.accent ? " accent" : ""}${figure.lead ? " lead" : ""}`}
              style={{ "--queue-delay": figure.delay } as CSSProperties}
            >
              <ellipse className="queue-figure-shadow" cx="0" cy="28" rx="22" ry="5" />
              <rect className="queue-figure-fill" height="34" rx="12" width="28" x="-14" y="-16" />
              <circle className="queue-figure-head" cx="0" cy="-34" r="10" />
              <path className="queue-figure-stroke" d="M0 -18v44" />
              <path className="queue-figure-stroke" d="M-15 -6c7-7 23-7 30 0" />
              <path className="queue-figure-stroke" d="M0 24l-11 24" />
              <path className="queue-figure-stroke" d="M0 24l11 24" />
              {figure.bag ? <rect className="queue-prop" height="14" rx="3" width="10" x="13" y="0" /> : null}
              {figure.phone ? <rect className="queue-prop queue-prop-small" height="11" rx="2" width="7" x="-18" y="-8" /> : null}
            </g>
          </g>
        ))}
      </svg>
    </div>
  );
}

export function TrustLoopIllustration() {
  return (
    <svg
      aria-label="Scout hold complete trust loop"
      className="trust-loop-illustration"
      role="img"
      viewBox="0 0 620 120"
    >
      <line stroke="var(--border)" strokeWidth="2" x1="96" x2="524" y1="60" y2="60" />
      <circle cx="96" cy="60" fill="var(--panel)" r="18" stroke="var(--accent)" strokeWidth="3" />
      <circle cx="310" cy="60" fill="var(--panel)" r="18" stroke="var(--accent)" strokeWidth="3" />
      <circle cx="524" cy="60" fill="var(--panel)" r="18" stroke="var(--accent)" strokeWidth="3" />
      <text fill="var(--text)" fontFamily="var(--font-heading), ui-sans-serif, system-ui, sans-serif" fontSize="18" fontWeight="700" textAnchor="middle" x="96" y="104">
        Scout
      </text>
      <text fill="var(--text)" fontFamily="var(--font-heading), ui-sans-serif, system-ui, sans-serif" fontSize="18" fontWeight="700" textAnchor="middle" x="310" y="104">
        Hold
      </text>
      <text fill="var(--text)" fontFamily="var(--font-heading), ui-sans-serif, system-ui, sans-serif" fontSize="18" fontWeight="700" textAnchor="middle" x="524" y="104">
        Complete
      </text>
    </svg>
  );
}

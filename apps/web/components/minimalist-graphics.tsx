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

"use client";

import type { SelfVerificationSessionView } from "@queuekeeper/shared";
import { getSelfDeepLink } from "../lib/self";

export function SelfQrPanel({
  demoMode = false,
  session
}: {
  demoMode?: boolean;
  session: SelfVerificationSessionView;
  onError: (error: unknown) => void;
  onSuccess: () => void | Promise<void>;
}) {
  const deepLink = getSelfDeepLink(session);

  return (
    <section className="card alt">
      <strong>Self verification</strong>
      <div className="muted" style={{ marginTop: 8 }}>
        Session: {session.sessionId} · status: {session.status}
      </div>
      <div className="muted" style={{ marginTop: 8 }}>
        {demoMode
          ? "Demo mode: verification is simulated by the QueueKeeper demo flow."
          : "Live mode uses the configured external Self verification endpoint."}
      </div>
      <div className="mono-block" style={{ marginTop: 12, wordBreak: "break-all" }}>
        {deepLink}
      </div>
      {demoMode ? null : (
        <a className="button secondary" href={deepLink} rel="noreferrer" target="_blank">
          Open Self on mobile
        </a>
      )}
    </section>
  );
}

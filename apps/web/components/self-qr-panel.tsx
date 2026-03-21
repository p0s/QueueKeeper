"use client";

import { SelfQRcodeWrapper } from "@selfxyz/qrcode";
import type { SelfVerificationSessionView } from "@queuekeeper/shared";
import { buildSelfApp, getSelfDeepLink } from "../lib/self";

export function SelfQrPanel({
  session,
  onError,
  onSuccess
}: {
  session: SelfVerificationSessionView;
  onError: (error: unknown) => void;
  onSuccess: () => void | Promise<void>;
}) {
  return (
    <section className="card alt">
      <strong>Self verification</strong>
      <div className="muted" style={{ marginTop: 8 }}>
        Session: {session.sessionId} · status: {session.status}
      </div>
      <div style={{ marginTop: 12 }}>
        <SelfQRcodeWrapper
          selfApp={buildSelfApp(session)}
          onError={onError}
          onSuccess={onSuccess}
        />
      </div>
      <a className="button secondary" href={getSelfDeepLink(session)} rel="noreferrer" target="_blank">
        Open Self on mobile
      </a>
    </section>
  );
}

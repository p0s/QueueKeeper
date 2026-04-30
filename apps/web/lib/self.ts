import type { SelfVerificationSessionView } from "@queuekeeper/shared";

export function getSelfDeepLink(session: SelfVerificationSessionView) {
  const url = new URL(session.endpoint);
  url.searchParams.set("scope", session.scope);
  url.searchParams.set("sessionId", session.sessionId);
  url.searchParams.set("userId", session.userId);
  url.searchParams.set("userIdType", session.userIdType);
  url.searchParams.set("userDefinedData", session.userDefinedData);
  return url.toString();
}

export async function verifySelfPayload(session: SelfVerificationSessionView, payload: Record<string, unknown>) {
  const apiUrl = process.env.SELF_API_URL;
  if (!apiUrl) {
    return {
      verified: false,
      reason: "Live Self verification requires SELF_API_URL.",
      resultJson: { provider: "self-external", sessionId: session.sessionId }
    };
  }

  const response = await fetch(apiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.SELF_API_KEY ? { Authorization: `Bearer ${process.env.SELF_API_KEY}` } : {})
    },
    body: JSON.stringify({
      session,
      payload
    })
  });
  const resultJson = await response.json();
  const verified = response.ok && Boolean(resultJson.verified ?? resultJson.result);
  return {
    verified,
    reason: verified ? null : (resultJson.reason ?? resultJson.message ?? `Self request failed: ${response.status}`),
    resultJson
  };
}

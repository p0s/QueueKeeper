import { AllIds, DefaultConfigStore, SelfBackendVerifier, getUniversalLink } from "@selfxyz/core";
import { SelfAppBuilder } from "@selfxyz/qrcode";
import type { SelfVerificationSessionView } from "@queuekeeper/shared";

export function buildSelfApp(session: SelfVerificationSessionView) {
  return new SelfAppBuilder({
    version: 2,
    appName: session.appName,
    scope: session.scope,
    endpoint: session.endpoint,
    endpointType: session.endpointType,
    userId: session.userId,
    userIdType: session.userIdType,
    userDefinedData: session.userDefinedData,
    disclosures: {
      minimumAge: 18,
      nationality: true
    },
    devMode: session.endpointType.startsWith("staging")
  }).build();
}

export function getSelfDeepLink(session: SelfVerificationSessionView) {
  return getUniversalLink(buildSelfApp(session));
}

export async function verifySelfPayload(session: SelfVerificationSessionView, payload: Record<string, unknown>) {
  const verifier = new SelfBackendVerifier(
    session.scope,
    session.endpoint,
    String(process.env.SELF_MOCK_PASSPORT ?? "true") === "true",
    AllIds,
    new DefaultConfigStore({
      minimumAge: 18,
      excludedCountries: [],
      ofac: false
    }),
    session.userIdType
  );

  const attestationId = Number(payload.attestationId);
  const proof = payload.proof as Parameters<SelfBackendVerifier["verify"]>[1];
  const pubSignals = (payload.publicSignals ?? payload.pubSignals) as Parameters<SelfBackendVerifier["verify"]>[2];
  const userContextData = String(payload.userContextData ?? session.userDefinedData);
  const result = await verifier.verify(attestationId as never, proof, pubSignals as never, userContextData);

  return {
    verified: result.isValidDetails.isValid,
    reason: result.isValidDetails.isValid ? null : "Self verification did not pass cryptographic validation.",
    resultJson: result
  };
}

# Security Policy

## Supported Branch

Security fixes are handled on `main`.

## Reporting

Please do not open public issues for suspected vulnerabilities or leaked secrets. Report privately to the repository owner through GitHub.

Include the affected commit, reproduction steps, expected behavior, actual behavior, and impact.

## Secret Handling

Never commit private keys, API keys, wallet credentials, live verification secrets, `.env.local`, `.queuekeeper-data`, `.queuekeeper-object-store`, `.secrets/`, `.vercel/`, or local submission payloads.

QueueKeeper stores private task payloads and proof media through encrypted local state in development. Public routes should expose only redacted task envelopes, hashes, receipts, and authorized reveal/proof data.

## Dependency Notes

The default public demo path uses mock verification where live third-party credentials are absent. Live Venice/Uniswap/x402 paths depend on their SDKs and should be re-audited before any production deployment that accepts untrusted traffic or real funds. Live Self verification is isolated behind `SELF_API_URL` so the default install does not ship the vulnerable Self proof SDK dependency chain.

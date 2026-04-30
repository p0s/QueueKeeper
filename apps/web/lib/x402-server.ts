import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { registerExactEvmScheme } from "@x402/evm/exact/server";

const facilitatorUrl = process.env.X402_FACILITATOR_URL?.trim() || "https://x402.org/facilitator";
const baseSepoliaNetwork = "eip155:84532";

let serverSingleton: x402ResourceServer | null = null;

export function getX402PayToAddress() {
  return (
    process.env.QUEUEKEEPER_AGENT_WALLET
    ?? process.env.NEXT_PUBLIC_QUEUEKEEPER_AGENT_WALLET
    ?? process.env.CELO_SEPOLIA_TEST_ADDRESS
    ?? "0xc5CfE770F01A308DF5D840d0Eb15f0b4cF264C81"
  );
}

export function getX402Server() {
  if (serverSingleton) {
    return serverSingleton;
  }

  const server = new x402ResourceServer(
    new HTTPFacilitatorClient({
      url: facilitatorUrl
    })
  );
  registerExactEvmScheme(server, {
    networks: [baseSepoliaNetwork]
  });
  serverSingleton = server;
  return serverSingleton;
}

export function getX402RouteConfig() {
  return {
    accepts: {
      scheme: "exact",
      price: "$0.01",
      network: baseSepoliaNetwork,
      payTo: getX402PayToAddress()
    },
    description: "Paid venue hint for QueueKeeper task planning",
    mimeType: "application/json"
  } as const;
}

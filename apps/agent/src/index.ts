import "dotenv/config";
import { createPublicClient, http } from "viem";
import { celoAlfajores } from "viem/chains";
import { buildPlannerDecision } from "@queuekeeper/shared";

const port = Number(process.env.PORT ?? 3001);
const rpcUrl = process.env.CELO_RPC_URL ?? celoAlfajores.rpcUrls.default.http[0];

const client = createPublicClient({
  chain: celoAlfajores,
  transport: http(rpcUrl)
});

async function main() {
  const chainId = await client.getChainId();
  const sampleDecision = buildPlannerDecision({
    urgency: "medium",
    scoutFee: 4,
    completionBonus: 20
  });

  console.log(`[queuekeeper-agent] listening on :${port}`);
  console.log(`[queuekeeper-agent] chainId=${chainId}`);
  console.log(`[queuekeeper-agent] sample-decision=${sampleDecision.action}`);
}

main().catch((error) => {
  console.error("agent boot failed", error);
  process.exit(1);
});

import { deployedAddresses, type ExplorerLinkView } from "@queuekeeper/shared";

const defaultExplorerBaseUrl = process.env.NEXT_PUBLIC_BLOCK_EXPLORER_BASE_URL ?? "https://celo-sepolia.blockscout.com";

export function getExplorerBaseUrl(): string {
  return defaultExplorerBaseUrl.replace(/\/+$/, "");
}

export function buildExplorerAddressUrl(address: string): string {
  return `${getExplorerBaseUrl()}/address/${address}`;
}

export function buildExplorerTxUrl(txHash: string): string {
  return `${getExplorerBaseUrl()}/tx/${txHash}`;
}

export function buildContractExplorerLinks(): ExplorerLinkView[] {
  return [
    { label: "Escrow contract", href: buildExplorerAddressUrl(deployedAddresses.escrow), kind: "contract" },
    { label: "Delegation policy", href: buildExplorerAddressUrl(deployedAddresses.policy), kind: "contract" },
    { label: "Proof registry", href: buildExplorerAddressUrl(deployedAddresses.proofRegistry), kind: "contract" }
  ];
}

export function buildTxExplorerLinks(links: Array<{ label: string; txHash: string | null | undefined }>): ExplorerLinkView[] {
  return links
    .filter((entry) => Boolean(entry.txHash))
    .map((entry) => ({
      label: entry.label,
      href: buildExplorerTxUrl(entry.txHash as string),
      kind: "tx" as const
    }));
}

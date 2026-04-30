import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const broadcastDir = path.join(root, 'broadcast', 'DeployQueueKeeper.s.sol');

function latestRunFile(dir) {
  if (!fs.existsSync(dir)) return null;
  const chainDirs = fs.readdirSync(dir).filter((name) => fs.statSync(path.join(dir, name)).isDirectory());
  for (const chainId of chainDirs) {
    const candidate = path.join(dir, chainId, 'run-latest.json');
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

const latest = latestRunFile(broadcastDir);
if (!latest) {
  console.error('No broadcast file found. Run forge script deployment first.');
  process.exit(1);
}

const json = JSON.parse(fs.readFileSync(latest, 'utf8'));
const creates = (json.transactions ?? []).filter((tx) => tx.transactionType === 'CREATE');
const [escrow, policy, proofRegistry] = creates.map((tx) => tx.contractAddress);

const generatedDir = path.resolve(root, '..', 'packages', 'shared', 'src', 'generated');
fs.mkdirSync(generatedDir, { recursive: true });
fs.writeFileSync(path.join(generatedDir, 'addresses.ts'), `export const deployedAddresses = {\n  escrow: ${JSON.stringify(escrow ?? null)},\n  policy: ${JSON.stringify(policy ?? null)},\n  proofRegistry: ${JSON.stringify(proofRegistry ?? null)}\n} as const;\n`);
console.log('Wrote packages/shared/src/generated/addresses.ts');

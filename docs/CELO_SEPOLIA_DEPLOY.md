# Celo Sepolia deploy

## Generated local test key
- Address:     0x14a5ca2c239ef9c957bb46a9cc11bd3b2184d97d
- Private key file:         .secrets/celo-sepolia-test.key

## Funding status
This wallet is generated locally for testing, but **not funded automatically** in this environment.

## Deploy steps

a) export the key

	export PRIVATE_KEY=$(cat .secrets/celo-sepolia-test.key)

b) deploy to Celo Sepolia

	cd contracts
	forge script script/DeployQueueKeeper.s.sol:DeployQueueKeeper \
	  --rpc-url https://forno.celo-sepolia.celo-testnet.org \
	  --broadcast

c) export deployed addresses back into the monorepo

	node script/export-addresses.mjs

## Explorer base
- https://celo-sepolia.blockscout.com

## Live deployed addresses
- Escrow: `0xb566298bf1c1afa55f0edc514b2f9d990c82f98c`
- Delegation policy: `0x8a1e766156d1107b99546c8d84f57f9dffd9bcb3`
- Proof registry: `0xc049de0d689bdf0186407a03708204c9e4199e49`
- Escrow explorer: https://celo-sepolia.blockscout.com/address/0xb566298bf1c1afa55f0edc514b2f9d990c82f98c
- Policy explorer: https://celo-sepolia.blockscout.com/address/0x8a1e766156d1107b99546c8d84f57f9dffd9bcb3
- Proof registry explorer: https://celo-sepolia.blockscout.com/address/0xc049de0d689bdf0186407a03708204c9e4199e49

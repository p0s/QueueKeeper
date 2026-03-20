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

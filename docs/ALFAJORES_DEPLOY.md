# Alfajores deploy

## Generated local test key
- Address:     0x14a5ca2c239ef9c957bb46a9cc11bd3b2184d97d
- Private key file:         ./.secrets/celo-alfajores-test.key

## Funding status
This wallet is generated locally for testing, but **not funded automatically** in this environment.

## Deploy steps

a) export the key

	export PRIVATE_KEY=$(cat ./.secrets/celo-alfajores-test.key)

b) deploy to Alfajores

	cd contracts
	forge script script/DeployQueueKeeper.s.sol:DeployQueueKeeper \
	  --rpc-url https://alfajores-forno.celo-testnet.org \
	  --broadcast

c) export deployed addresses back into the monorepo

	node script/export-addresses.mjs

## Explorer base
- https://alfajores.celoscan.io

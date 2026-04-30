// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {QueueKeeperEscrow} from "../src/QueueKeeperEscrow.sol";
import {QueueKeeperDelegationPolicy} from "../src/QueueKeeperDelegationPolicy.sol";
import {ProofHashRegistry} from "../src/ProofHashRegistry.sol";

contract DeployQueueKeeper is Script {
    function run() external returns (QueueKeeperEscrow escrow, QueueKeeperDelegationPolicy policy, ProofHashRegistry proofRegistry) {
        uint256 deployerKey = vm.envUint("PRIVATE_KEY");
        vm.startBroadcast(deployerKey);

        escrow = new QueueKeeperEscrow();
        policy = new QueueKeeperDelegationPolicy();
        proofRegistry = new ProofHashRegistry(address(escrow));

        vm.stopBroadcast();
    }
}

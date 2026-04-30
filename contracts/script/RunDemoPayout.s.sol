// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Script.sol";
import {QueueKeeperEscrow} from "../src/QueueKeeperEscrow.sol";
import {MockERC20} from "../test/MockERC20.sol";

contract RunDemoPayout is Script {
    function run() external returns (MockERC20 token, uint256 jobId) {
        uint256 buyerKey = vm.envUint("PRIVATE_KEY");
        address escrowAddr = vm.envAddress("QUEUEKEEPER_ESCROW_ADDRESS");
        QueueKeeperEscrow escrow = QueueKeeperEscrow(escrowAddr);

        uint256 runnerKey = uint256(keccak256(abi.encodePacked("queuekeeper-runner-demo")));
        address runner = vm.addr(runnerKey);

        vm.startBroadcast(buyerKey);
        token = new MockERC20();
        token.mint(vm.addr(buyerKey), 35 ether);
        token.approve(address(escrow), type(uint256).max);
        payable(runner).transfer(0.02 ether);
        jobId = escrow.createJob(
            QueueKeeperEscrow.JobConfig({
                token: address(token),
                runner: runner,
                scoutFee: 4 ether,
                arrivalFee: 6 ether,
                heartbeatFee: 5 ether,
                completionFee: 20 ether,
                expiry: uint64(block.timestamp + 2 hours),
                detailsHash: keccak256("queuekeeper-demo-job")
            })
        );
        vm.stopBroadcast();

        vm.startBroadcast(runnerKey);
        escrow.acceptJob(jobId, hex"1234");
        escrow.submitProofHash(jobId, 1, keccak256("queuekeeper-demo-scout-proof"));
        vm.stopBroadcast();

        vm.startBroadcast(buyerKey);
        escrow.releaseScout(jobId);
        vm.stopBroadcast();
    }
}

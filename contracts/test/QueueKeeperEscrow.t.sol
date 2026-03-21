// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {QueueKeeperEscrow} from "../src/QueueKeeperEscrow.sol";
import {MockERC20} from "./MockERC20.sol";

contract QueueKeeperEscrowTest is Test {
    QueueKeeperEscrow internal escrow;
    MockERC20 internal token;

    address internal buyer = address(0xB0B);
    address internal runner = address(0xA11CE);
    address internal arbiter = address(0xAB171E);

    function setUp() public {
        escrow = new QueueKeeperEscrow();
        token = new MockERC20();
        token.mint(buyer, 100 ether);

        vm.prank(buyer);
        token.approve(address(escrow), type(uint256).max);
    }

    function testHappyPathWithRepeatedHeartbeats() public {
        uint256 jobId = _createJob();

        vm.prank(runner);
        escrow.acceptJob(jobId, hex"1234");

        vm.prank(runner);
        escrow.submitProofHash(jobId, 1, keccak256("scout"));
        vm.prank(buyer);
        escrow.releaseScout(jobId);

        vm.prank(runner);
        escrow.submitProofHash(jobId, 2, keccak256("arrival"));
        vm.prank(buyer);
        escrow.releaseArrival(jobId);

        vm.prank(runner);
        escrow.submitProofHash(jobId, 11, keccak256("heartbeat-1"));
        vm.prank(buyer);
        escrow.releaseHeartbeat(jobId);

        vm.prank(runner);
        escrow.submitProofHash(jobId, 12, keccak256("heartbeat-2"));
        vm.prank(buyer);
        escrow.releaseHeartbeat(jobId);

        vm.prank(runner);
        escrow.submitProofHash(jobId, 200, keccak256("completion"));
        vm.prank(buyer);
        escrow.releaseCompletion(jobId);

        assertEq(token.balanceOf(runner), 35 ether);
        (
            address buyerAddress,
            address tokenAddress,
            address runnerAddress,
            address arbiterAddress,
            uint96 scoutFee,
            uint96 arrivalFee,
            uint96 heartbeatFee,
            uint96 completionFee,
            uint96 totalAmount,
            uint64 expiry,
            bytes32 detailsHash,
            uint32 lowRiskWindow,
            uint32 disputeWindow,
            uint8 heartbeatCount,
            uint8 heartbeatsReleased,
            uint8 disputedStage,
            QueueKeeperEscrow.JobStage stage,
            bool accepted,
            bool refunded,
            bool scoutReleased,
            bool arrivalReleased,
            bool completionReleased,
            bool disputed
        ) = escrow.jobs(jobId);
        assertEq(totalAmount, 35 ether);
        assertEq(heartbeatCount, 2);
        assertEq(heartbeatsReleased, 2);
        assertEq(uint256(stage), uint256(QueueKeeperEscrow.JobStage.CompletionReleased));
        buyerAddress; tokenAddress; runnerAddress; arbiterAddress; scoutFee; arrivalFee; heartbeatFee; completionFee; expiry; detailsHash; lowRiskWindow; disputeWindow; disputedStage; accepted; refunded; scoutReleased; arrivalReleased; completionReleased; disputed;
    }

    function testAutoReleaseHeartbeatAfterTimeout() public {
        uint256 jobId = _createJob();

        vm.prank(runner);
        escrow.acceptJob(jobId, "");

        vm.prank(runner);
        escrow.submitProofHash(jobId, 1, keccak256("scout"));
        vm.warp(uint256(escrow.proofSubmittedAt(jobId, 1)) + 10 minutes + 1);
        escrow.autoReleaseStage(jobId, 1);

        vm.prank(runner);
        escrow.submitProofHash(jobId, 2, keccak256("arrival"));
        vm.warp(uint256(escrow.proofSubmittedAt(jobId, 2)) + 10 minutes + 1);
        escrow.autoReleaseStage(jobId, 2);

        vm.prank(runner);
        escrow.submitProofHash(jobId, 11, keccak256("heartbeat-1"));
        vm.warp(uint256(escrow.proofSubmittedAt(jobId, 11)) + 10 minutes + 1);
        escrow.autoReleaseStage(jobId, 11);

        (
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            ,
            uint8 releasedHeartbeats,
            ,
            QueueKeeperEscrow.JobStage stage,
            ,
            ,
            ,
            ,
            ,
            
        ) = escrow.jobs(jobId);
        assertEq(releasedHeartbeats, 1);
        assertEq(uint256(stage), uint256(QueueKeeperEscrow.JobStage.HeartbeatReleased));
    }

    function testDisputeFreezesAndArbiterRefunds() public {
        uint256 jobId = _createJob();

        vm.prank(runner);
        escrow.acceptJob(jobId, "");

        vm.prank(runner);
        escrow.submitProofHash(jobId, 1, keccak256("scout"));

        vm.prank(buyer);
        escrow.disputeStage(jobId, 1);

        vm.prank(buyer);
        vm.expectRevert(QueueKeeperEscrow.InvalidStage.selector);
        escrow.releaseScout(jobId);

        uint256 buyerBefore = token.balanceOf(buyer);
        vm.prank(arbiter);
        escrow.settleDispute(jobId, false);

        assertEq(token.balanceOf(buyer), buyerBefore + 35 ether);
    }

    function testRefundAfterExpiry() public {
        uint256 jobId = _createJob();

        vm.warp(block.timestamp + 2 hours + 1);

        uint256 buyerBefore = token.balanceOf(buyer);
        vm.prank(buyer);
        escrow.refundJob(jobId);

        assertEq(token.balanceOf(buyer), buyerBefore + 35 ether);
    }

    function _createJob() internal returns (uint256) {
        vm.prank(buyer);
        return escrow.createJob(
            QueueKeeperEscrow.JobConfig({
                token: address(token),
                runner: runner,
                scoutFee: 4 ether,
                arrivalFee: 6 ether,
                heartbeatFee: 5 ether,
                completionFee: 15 ether,
                heartbeatCount: 2,
                lowRiskAutoReleaseWindow: 10 minutes,
                disputeWindow: 30 minutes,
                expiry: uint64(block.timestamp + 2 hours),
                detailsHash: keccak256("job"),
                arbiter: arbiter
            })
        );
    }
}

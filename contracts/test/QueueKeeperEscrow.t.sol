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

    function setUp() public {
        escrow = new QueueKeeperEscrow();
        token = new MockERC20();
        token.mint(buyer, 100 ether);

        vm.prank(buyer);
        token.approve(address(escrow), type(uint256).max);
    }

    function testHappyPath() public {
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
        escrow.submitProofHash(jobId, 3, keccak256("heartbeat"));
        vm.prank(buyer);
        escrow.releaseHeartbeat(jobId);

        vm.prank(runner);
        escrow.submitProofHash(jobId, 4, keccak256("completion"));
        vm.prank(buyer);
        escrow.releaseCompletion(jobId);

        assertEq(token.balanceOf(runner), 35 ether);
        (, , , , , , , uint96 totalAmount, , , , , ) = escrow.jobs(jobId);
        assertEq(totalAmount, 35 ether);
    }

    function testCannotReleaseWrongStage() public {
        uint256 jobId = _createJob();

        vm.prank(runner);
        escrow.acceptJob(jobId, "");

        vm.prank(buyer);
        vm.expectRevert(QueueKeeperEscrow.InvalidStage.selector);
        escrow.releaseArrival(jobId);
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
                completionFee: 20 ether,
                expiry: uint64(block.timestamp + 2 hours),
                detailsHash: keccak256("job")
            })
        );
    }
}

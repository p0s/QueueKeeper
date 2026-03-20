// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import {QueueKeeperDelegationPolicy} from "../src/QueueKeeperDelegationPolicy.sol";

contract QueueKeeperDelegationPolicyTest is Test {
    QueueKeeperDelegationPolicy internal policy;

    address internal buyer = address(0xB0B);
    address internal delegate = address(0xD311);
    address internal token = address(0xC0DE);
    address internal target = address(0xE5C0);
    bytes32 internal jobId = keccak256("qk-1");

    function setUp() public {
        policy = new QueueKeeperDelegationPolicy();
    }

    function testValidateAndRecordSpend() public {
        uint256 policyId = _createPolicy();

        vm.prank(delegate);
        policy.validateAndRecordSpend(policyId, token, target, 10 ether, jobId);

        (, , , , uint256 maxSpend, uint256 spent, , , ) = policy.policies(policyId);
        assertEq(maxSpend, 40 ether);
        assertEq(spent, 10 ether);
    }

    function testRejectOverspend() public {
        uint256 policyId = _createPolicy();

        vm.prank(delegate);
        vm.expectRevert(QueueKeeperDelegationPolicy.SpendExceeded.selector);
        policy.validateAndRecordSpend(policyId, token, target, 50 ether, jobId);
    }

    function testRejectExpiredPolicy() public {
        uint256 policyId = _createPolicy();
        vm.warp(block.timestamp + 2 hours + 1);

        vm.prank(delegate);
        vm.expectRevert(QueueKeeperDelegationPolicy.PolicyExpired.selector);
        policy.validateAndRecordSpend(policyId, token, target, 1 ether, jobId);
    }

    function _createPolicy() internal returns (uint256) {
        vm.prank(buyer);
        return policy.createPolicy(delegate, token, target, 40 ether, block.timestamp + 2 hours, jobId);
    }
}

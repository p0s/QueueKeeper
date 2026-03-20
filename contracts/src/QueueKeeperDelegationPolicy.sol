// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract QueueKeeperDelegationPolicy {
    struct Policy {
        address buyer;
        address delegate;
        address token;
        address target;
        uint256 maxSpend;
        uint256 spent;
        uint256 expiry;
        bytes32 jobId;
        bool active;
    }

    error Unauthorized();
    error PolicyExpired();
    error PolicyInactive();
    error InvalidTarget();
    error InvalidToken();
    error JobMismatch();
    error SpendExceeded();

    uint256 public nextPolicyId = 1;
    mapping(uint256 => Policy) public policies;

    event PolicyCreated(
        uint256 indexed policyId,
        address indexed buyer,
        address indexed delegate,
        address token,
        address target,
        uint256 maxSpend,
        uint256 expiry,
        bytes32 jobId
    );
    event PolicySpendRecorded(uint256 indexed policyId, uint256 amount, uint256 totalSpent);
    event PolicyRevoked(uint256 indexed policyId);

    function createPolicy(
        address delegate,
        address token,
        address target,
        uint256 maxSpend,
        uint256 expiry,
        bytes32 jobId
    ) external returns (uint256 policyId) {
        policyId = nextPolicyId++;
        policies[policyId] = Policy({
            buyer: msg.sender,
            delegate: delegate,
            token: token,
            target: target,
            maxSpend: maxSpend,
            spent: 0,
            expiry: expiry,
            jobId: jobId,
            active: true
        });

        emit PolicyCreated(policyId, msg.sender, delegate, token, target, maxSpend, expiry, jobId);
    }

    function validateAndRecordSpend(
        uint256 policyId,
        address token,
        address target,
        uint256 amount,
        bytes32 jobId
    ) external {
        Policy storage policy = policies[policyId];
        if (!policy.active) revert PolicyInactive();
        if (block.timestamp > policy.expiry) revert PolicyExpired();
        if (msg.sender != policy.delegate && msg.sender != policy.buyer) revert Unauthorized();
        if (token != policy.token) revert InvalidToken();
        if (target != policy.target) revert InvalidTarget();
        if (jobId != policy.jobId) revert JobMismatch();
        if (policy.spent + amount > policy.maxSpend) revert SpendExceeded();

        policy.spent += amount;
        emit PolicySpendRecorded(policyId, amount, policy.spent);
    }

    function revokePolicy(uint256 policyId) external {
        Policy storage policy = policies[policyId];
        if (msg.sender != policy.buyer) revert Unauthorized();
        policy.active = false;
        emit PolicyRevoked(policyId);
    }
}

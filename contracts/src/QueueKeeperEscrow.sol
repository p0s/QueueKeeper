// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract QueueKeeperEscrow {
    uint8 internal constant PROOF_STAGE_SCOUT = 1;
    uint8 internal constant PROOF_STAGE_ARRIVAL = 2;
    uint8 internal constant PROOF_STAGE_HEARTBEAT_BASE = 10;
    uint8 internal constant PROOF_STAGE_COMPLETION = 200;

    enum JobStage {
        None,
        Accepted,
        ScoutReleased,
        ArrivalReleased,
        HeartbeatReleased,
        CompletionReleased,
        Disputed,
        Refunded
    }

    struct JobConfig {
        address token;
        address runner;
        uint96 scoutFee;
        uint96 arrivalFee;
        uint96 heartbeatFee;
        uint96 completionFee;
        uint8 heartbeatCount;
        uint32 lowRiskAutoReleaseWindow;
        uint32 disputeWindow;
        uint64 expiry;
        bytes32 detailsHash;
        address arbiter;
    }

    struct Job {
        address buyer;
        address token;
        address runner;
        address arbiter;
        uint96 scoutFee;
        uint96 arrivalFee;
        uint96 heartbeatFee;
        uint96 completionFee;
        uint96 totalAmount;
        uint64 expiry;
        bytes32 detailsHash;
        uint32 lowRiskAutoReleaseWindow;
        uint32 disputeWindow;
        uint8 heartbeatCount;
        uint8 heartbeatsReleased;
        uint8 disputedStage;
        JobStage stage;
        bool accepted;
        bool refunded;
        bool scoutReleased;
        bool arrivalReleased;
        bool completionReleased;
        bool disputed;
    }

    error InvalidAmount();
    error InvalidRunner();
    error JobMissing();
    error Unauthorized();
    error InvalidStage();
    error AlreadyAccepted();
    error JobExpired();
    error NotExpired();
    error TransferFailed();
    error AutoReleaseNotReady();
    error AlreadyReleased();
    error NoActiveDispute();

    uint256 public nextJobId = 1;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => mapping(uint8 => bytes32)) public proofHashes;
    mapping(uint256 => mapping(uint8 => uint64)) public proofSubmittedAt;

    event JobCreated(uint256 indexed jobId, address indexed buyer, address indexed token, uint256 totalAmount, uint64 expiry, bytes32 detailsHash);
    event JobAccepted(uint256 indexed jobId, address indexed runner, bytes selfProofRef);
    event ProofSubmitted(uint256 indexed jobId, uint8 indexed proofStage, bytes32 proofHash);
    event StageReleased(uint256 indexed jobId, uint8 indexed stage, address indexed runner, uint256 amount);
    event StageDisputed(uint256 indexed jobId, uint8 indexed proofStage, address indexed buyer);
    event DisputeSettled(uint256 indexed jobId, uint8 indexed proofStage, bool releasedToRunner);
    event JobRefunded(uint256 indexed jobId, address indexed buyer, uint256 amount);

    function createJob(JobConfig calldata config) external returns (uint256 jobId) {
        if (config.runner == address(0)) revert InvalidRunner();
        if (config.expiry <= block.timestamp) revert JobExpired();

        uint256 totalAmount = uint256(config.scoutFee)
            + uint256(config.arrivalFee)
            + uint256(config.heartbeatFee) * uint256(config.heartbeatCount)
            + uint256(config.completionFee);

        if (totalAmount == 0 || totalAmount > type(uint96).max) revert InvalidAmount();

        _safeTransferFrom(config.token, msg.sender, address(this), totalAmount);

        jobId = nextJobId++;
        jobs[jobId] = Job({
            buyer: msg.sender,
            token: config.token,
            runner: config.runner,
            arbiter: config.arbiter,
            scoutFee: config.scoutFee,
            arrivalFee: config.arrivalFee,
            heartbeatFee: config.heartbeatFee,
            completionFee: config.completionFee,
            totalAmount: uint96(totalAmount),
            expiry: config.expiry,
            detailsHash: config.detailsHash,
            lowRiskAutoReleaseWindow: config.lowRiskAutoReleaseWindow,
            disputeWindow: config.disputeWindow,
            heartbeatCount: config.heartbeatCount,
            heartbeatsReleased: 0,
            disputedStage: 0,
            stage: JobStage.None,
            accepted: false,
            refunded: false,
            scoutReleased: false,
            arrivalReleased: false,
            completionReleased: false,
            disputed: false
        });

        emit JobCreated(jobId, msg.sender, config.token, totalAmount, config.expiry, config.detailsHash);
    }

    function acceptJob(uint256 jobId, bytes calldata selfProofRef) external {
        Job storage job = _job(jobId);
        if (msg.sender != job.runner) revert Unauthorized();
        if (job.accepted) revert AlreadyAccepted();
        if (block.timestamp > job.expiry) revert JobExpired();

        job.accepted = true;
        job.stage = JobStage.Accepted;

        emit JobAccepted(jobId, msg.sender, selfProofRef);
    }

    function submitProofHash(uint256 jobId, uint8 proofStage, bytes32 proofHash) external {
        Job storage job = _job(jobId);
        if (!_isParticipant(job, msg.sender)) revert Unauthorized();
        if (!job.accepted || job.refunded) revert InvalidStage();

        proofHashes[jobId][proofStage] = proofHash;
        proofSubmittedAt[jobId][proofStage] = uint64(block.timestamp);
        emit ProofSubmitted(jobId, proofStage, proofHash);
    }

    function releaseScout(uint256 jobId) external {
        Job storage job = _job(jobId);
        _requireBuyer(job);
        _releaseStage(jobId, job, PROOF_STAGE_SCOUT);
    }

    function releaseArrival(uint256 jobId) external {
        Job storage job = _job(jobId);
        _requireBuyer(job);
        _releaseStage(jobId, job, PROOF_STAGE_ARRIVAL);
    }

    function releaseHeartbeat(uint256 jobId) external {
        Job storage job = _job(jobId);
        _requireBuyer(job);
        uint8 proofStage = _nextHeartbeatProofStage(job);
        _releaseStage(jobId, job, proofStage);
    }

    function releaseCompletion(uint256 jobId) external {
        Job storage job = _job(jobId);
        _requireBuyer(job);
        _releaseStage(jobId, job, PROOF_STAGE_COMPLETION);
    }

    function autoReleaseStage(uint256 jobId, uint8 proofStage) external {
        Job storage job = _job(jobId);
        if (proofStage == PROOF_STAGE_COMPLETION) revert InvalidStage();
        if (job.lowRiskAutoReleaseWindow == 0) revert AutoReleaseNotReady();
        if (proofSubmittedAt[jobId][proofStage] == 0) revert InvalidStage();
        if (uint256(proofSubmittedAt[jobId][proofStage]) + uint256(job.lowRiskAutoReleaseWindow) > block.timestamp) {
            revert AutoReleaseNotReady();
        }
        _releaseStage(jobId, job, proofStage);
    }

    function disputeStage(uint256 jobId, uint8 proofStage) external {
        Job storage job = _job(jobId);
        _requireBuyer(job);
        if (proofSubmittedAt[jobId][proofStage] == 0) revert InvalidStage();
        if (uint256(proofSubmittedAt[jobId][proofStage]) + uint256(job.disputeWindow) < block.timestamp) revert InvalidStage();

        job.disputed = true;
        job.disputedStage = proofStage;
        job.stage = JobStage.Disputed;
        emit StageDisputed(jobId, proofStage, msg.sender);
    }

    function settleDispute(uint256 jobId, bool releaseToRunner) external {
        Job storage job = _job(jobId);
        if (msg.sender != job.buyer && msg.sender != job.arbiter) revert Unauthorized();
        if (!job.disputed) revert NoActiveDispute();

        uint8 disputedStage = job.disputedStage;
        if (releaseToRunner && !_isReleased(job, disputedStage)) {
            _releaseStage(jobId, job, disputedStage);
        } else if (!releaseToRunner) {
            uint256 amount = _remaining(job);
            job.refunded = true;
            job.stage = JobStage.Refunded;
            _safeTransfer(job.token, job.buyer, amount);
            emit JobRefunded(jobId, job.buyer, amount);
        }

        job.disputed = false;
        job.disputedStage = 0;
        _refreshStage(job);
        emit DisputeSettled(jobId, disputedStage, releaseToRunner);
    }

    function refundJob(uint256 jobId) external {
        Job storage job = _job(jobId);
        _requireBuyer(job);
        if (block.timestamp <= job.expiry) revert NotExpired();
        if (job.refunded || job.completionReleased) revert InvalidStage();

        uint256 amount = _remaining(job);
        job.refunded = true;
        job.stage = JobStage.Refunded;
        _safeTransfer(job.token, job.buyer, amount);

        emit JobRefunded(jobId, job.buyer, amount);
    }

    function _releaseStage(uint256 jobId, Job storage job, uint8 proofStage) internal {
        if (job.disputed) revert InvalidStage();
        if (proofHashes[jobId][proofStage] == bytes32(0)) revert InvalidStage();
        if (_isReleased(job, proofStage)) revert AlreadyReleased();

        uint256 amount;
        if (proofStage == PROOF_STAGE_SCOUT) {
            if (!job.accepted || job.scoutReleased) revert InvalidStage();
            amount = job.scoutFee;
            job.scoutReleased = true;
        } else if (proofStage == PROOF_STAGE_ARRIVAL) {
            if (!_arrivalUnlocked(job) || job.arrivalReleased) revert InvalidStage();
            amount = job.arrivalFee;
            job.arrivalReleased = true;
        } else if (_isHeartbeatProofStage(proofStage)) {
            uint8 expected = _nextHeartbeatProofStage(job);
            if (proofStage != expected) revert InvalidStage();
            if (!_heartbeatUnlocked(job)) revert InvalidStage();
            amount = job.heartbeatFee;
            job.heartbeatsReleased += 1;
        } else if (proofStage == PROOF_STAGE_COMPLETION) {
            if (!_completionUnlocked(job) || job.completionReleased) revert InvalidStage();
            amount = job.completionFee;
            job.completionReleased = true;
        } else {
            revert InvalidStage();
        }

        _refreshStage(job);
        _safeTransfer(job.token, job.runner, amount);
        emit StageReleased(jobId, proofStage, job.runner, amount);
    }

    function _refreshStage(Job storage job) internal {
        if (job.refunded) {
            job.stage = JobStage.Refunded;
        } else if (job.disputed) {
            job.stage = JobStage.Disputed;
        } else if (job.completionReleased) {
            job.stage = JobStage.CompletionReleased;
        } else if (job.heartbeatsReleased > 0) {
            job.stage = JobStage.HeartbeatReleased;
        } else if (job.arrivalReleased) {
            job.stage = JobStage.ArrivalReleased;
        } else if (job.scoutReleased) {
            job.stage = JobStage.ScoutReleased;
        } else if (job.accepted) {
            job.stage = JobStage.Accepted;
        } else {
            job.stage = JobStage.None;
        }
    }

    function _remaining(Job storage job) internal view returns (uint256) {
        uint256 remaining = 0;
        if (!job.scoutReleased) remaining += job.scoutFee;
        if (!job.arrivalReleased) remaining += job.arrivalFee;
        uint256 unreleasedHeartbeats = uint256(job.heartbeatCount) - uint256(job.heartbeatsReleased);
        remaining += unreleasedHeartbeats * uint256(job.heartbeatFee);
        if (!job.completionReleased) remaining += job.completionFee;
        return remaining;
    }

    function _arrivalUnlocked(Job storage job) internal view returns (bool) {
        return job.accepted && (job.scoutFee == 0 || job.scoutReleased);
    }

    function _heartbeatUnlocked(Job storage job) internal view returns (bool) {
        return job.accepted && (job.arrivalFee == 0 || job.arrivalReleased);
    }

    function _completionUnlocked(Job storage job) internal view returns (bool) {
        return job.accepted && uint256(job.heartbeatsReleased) == uint256(job.heartbeatCount);
    }

    function _nextHeartbeatProofStage(Job storage job) internal view returns (uint8) {
        return PROOF_STAGE_HEARTBEAT_BASE + job.heartbeatsReleased + 1;
    }

    function _isHeartbeatProofStage(uint8 proofStage) internal pure returns (bool) {
        return proofStage >= PROOF_STAGE_HEARTBEAT_BASE && proofStage < PROOF_STAGE_COMPLETION;
    }

    function _isReleased(Job storage job, uint8 proofStage) internal view returns (bool) {
        if (proofStage == PROOF_STAGE_SCOUT) return job.scoutReleased;
        if (proofStage == PROOF_STAGE_ARRIVAL) return job.arrivalReleased;
        if (proofStage == PROOF_STAGE_COMPLETION) return job.completionReleased;
        if (_isHeartbeatProofStage(proofStage)) {
            uint8 sequence = proofStage - PROOF_STAGE_HEARTBEAT_BASE;
            return sequence != 0 && sequence <= job.heartbeatsReleased;
        }
        return false;
    }

    function _job(uint256 jobId) internal view returns (Job storage job) {
        job = jobs[jobId];
        if (job.buyer == address(0)) revert JobMissing();
    }

    function _requireBuyer(Job storage job) internal view {
        if (msg.sender != job.buyer) revert Unauthorized();
    }

    function _isParticipant(Job storage job, address account) internal view returns (bool) {
        return account == job.buyer || account == job.runner;
    }

    function _safeTransferFrom(address token, address from, address to, uint256 value) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSignature("transferFrom(address,address,uint256)", from, to, value));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }

    function _safeTransfer(address token, address to, uint256 value) internal {
        (bool ok, bytes memory data) = token.call(abi.encodeWithSignature("transfer(address,uint256)", to, value));
        if (!ok || (data.length != 0 && !abi.decode(data, (bool)))) revert TransferFailed();
    }
}

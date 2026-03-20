// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract QueueKeeperEscrow {
    enum JobStage {
        None,
        Accepted,
        ScoutReleased,
        ArrivalReleased,
        HeartbeatReleased,
        CompletionReleased,
        Refunded
    }

    struct JobConfig {
        address token;
        address runner;
        uint96 scoutFee;
        uint96 arrivalFee;
        uint96 heartbeatFee;
        uint96 completionFee;
        uint64 expiry;
        bytes32 detailsHash;
    }

    struct Job {
        address buyer;
        address token;
        address runner;
        uint96 scoutFee;
        uint96 arrivalFee;
        uint96 heartbeatFee;
        uint96 completionFee;
        uint96 totalAmount;
        uint64 expiry;
        bytes32 detailsHash;
        JobStage stage;
        bool accepted;
        bool refunded;
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

    uint256 public nextJobId = 1;
    mapping(uint256 => Job) public jobs;
    mapping(uint256 => mapping(uint8 => bytes32)) public proofHashes;

    event JobCreated(uint256 indexed jobId, address indexed buyer, address indexed token, uint256 totalAmount, uint64 expiry, bytes32 detailsHash);
    event JobAccepted(uint256 indexed jobId, address indexed runner, bytes selfProofRef);
    event ProofSubmitted(uint256 indexed jobId, uint8 indexed proofStage, bytes32 proofHash);
    event StageReleased(uint256 indexed jobId, uint8 indexed stage, address indexed runner, uint256 amount);
    event JobRefunded(uint256 indexed jobId, address indexed buyer, uint256 amount);

    function createJob(JobConfig calldata config) external returns (uint256 jobId) {
        if (config.runner == address(0)) revert InvalidRunner();
        if (config.expiry <= block.timestamp) revert JobExpired();

        uint256 totalAmount = uint256(config.scoutFee) + uint256(config.arrivalFee) + uint256(config.heartbeatFee) + uint256(config.completionFee);
        if (totalAmount == 0 || totalAmount > type(uint96).max) revert InvalidAmount();

        _safeTransferFrom(config.token, msg.sender, address(this), totalAmount);

        jobId = nextJobId++;
        jobs[jobId] = Job({
            buyer: msg.sender,
            token: config.token,
            runner: config.runner,
            scoutFee: config.scoutFee,
            arrivalFee: config.arrivalFee,
            heartbeatFee: config.heartbeatFee,
            completionFee: config.completionFee,
            totalAmount: uint96(totalAmount),
            expiry: config.expiry,
            detailsHash: config.detailsHash,
            stage: JobStage.None,
            accepted: false,
            refunded: false
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
        if (!job.accepted) revert InvalidStage();

        proofHashes[jobId][proofStage] = proofHash;
        emit ProofSubmitted(jobId, proofStage, proofHash);
    }

    function releaseScout(uint256 jobId) external {
        Job storage job = _job(jobId);
        if (msg.sender != job.buyer) revert Unauthorized();
        if (!job.accepted || job.stage != JobStage.Accepted) revert InvalidStage();
        _release(jobId, job, JobStage.ScoutReleased, 1, job.scoutFee);
    }

    function releaseArrival(uint256 jobId) external {
        Job storage job = _job(jobId);
        if (msg.sender != job.buyer) revert Unauthorized();
        if (job.stage != JobStage.ScoutReleased) revert InvalidStage();
        _release(jobId, job, JobStage.ArrivalReleased, 2, job.arrivalFee);
    }

    function releaseHeartbeat(uint256 jobId) external {
        Job storage job = _job(jobId);
        if (msg.sender != job.buyer) revert Unauthorized();
        if (job.stage != JobStage.ArrivalReleased) revert InvalidStage();
        _release(jobId, job, JobStage.HeartbeatReleased, 3, job.heartbeatFee);
    }

    function releaseCompletion(uint256 jobId) external {
        Job storage job = _job(jobId);
        if (msg.sender != job.buyer) revert Unauthorized();
        if (job.stage != JobStage.HeartbeatReleased) revert InvalidStage();
        _release(jobId, job, JobStage.CompletionReleased, 4, job.completionFee);
    }

    function refundJob(uint256 jobId) external {
        Job storage job = _job(jobId);
        if (msg.sender != job.buyer) revert Unauthorized();
        if (block.timestamp <= job.expiry) revert NotExpired();
        if (job.refunded || job.stage == JobStage.CompletionReleased) revert InvalidStage();

        uint256 amount = _remaining(job);
        job.refunded = true;
        job.stage = JobStage.Refunded;
        _safeTransfer(job.token, job.buyer, amount);

        emit JobRefunded(jobId, job.buyer, amount);
    }

    function _release(uint256 jobId, Job storage job, JobStage newStage, uint8 proofStage, uint256 amount) internal {
        if (proofHashes[jobId][proofStage] == bytes32(0)) revert InvalidStage();
        job.stage = newStage;
        _safeTransfer(job.token, job.runner, amount);
        emit StageReleased(jobId, uint8(newStage), job.runner, amount);
    }

    function _remaining(Job storage job) internal view returns (uint256) {
        if (job.stage == JobStage.None || job.stage == JobStage.Accepted) {
            return job.totalAmount;
        }
        if (job.stage == JobStage.ScoutReleased) {
            return job.arrivalFee + job.heartbeatFee + job.completionFee;
        }
        if (job.stage == JobStage.ArrivalReleased) {
            return job.heartbeatFee + job.completionFee;
        }
        if (job.stage == JobStage.HeartbeatReleased) {
            return job.completionFee;
        }
        return 0;
    }

    function _job(uint256 jobId) internal view returns (Job storage job) {
        job = jobs[jobId];
        if (job.buyer == address(0)) revert JobMissing();
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

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ProofHashRegistry {
    struct ProofRecord {
        uint256 jobId;
        uint8 stage;
        bytes32 proofHash;
        string encryptedURI;
        address submitter;
        uint64 timestamp;
    }

    error Unauthorized();

    address public immutable escrow;
    mapping(uint256 => mapping(uint8 => ProofRecord)) public proofs;

    event ProofRecorded(
        uint256 indexed jobId,
        uint8 indexed stage,
        bytes32 indexed proofHash,
        string encryptedURI,
        address submitter,
        uint64 timestamp
    );

    constructor(address escrow_) {
        escrow = escrow_;
    }

    function recordProof(
        uint256 jobId,
        uint8 stage,
        bytes32 proofHash,
        string calldata encryptedURI,
        address submitter
    ) external {
        if (msg.sender != escrow) revert Unauthorized();

        proofs[jobId][stage] = ProofRecord({
            jobId: jobId,
            stage: stage,
            proofHash: proofHash,
            encryptedURI: encryptedURI,
            submitter: submitter,
            timestamp: uint64(block.timestamp)
        });

        emit ProofRecorded(jobId, stage, proofHash, encryptedURI, submitter, uint64(block.timestamp));
    }
}

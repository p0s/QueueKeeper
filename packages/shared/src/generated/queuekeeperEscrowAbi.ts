export const queueKeeperEscrowAbi = [
  {
    type: "function",
    name: "createJob",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "config",
        type: "tuple",
        components: [
          { name: "token", type: "address" },
          { name: "runner", type: "address" },
          { name: "scoutFee", type: "uint96" },
          { name: "arrivalFee", type: "uint96" },
          { name: "heartbeatFee", type: "uint96" },
          { name: "completionFee", type: "uint96" },
          { name: "heartbeatCount", type: "uint8" },
          { name: "lowRiskAutoReleaseWindow", type: "uint32" },
          { name: "disputeWindow", type: "uint32" },
          { name: "expiry", type: "uint64" },
          { name: "detailsHash", type: "bytes32" },
          { name: "arbiter", type: "address" }
        ]
      }
    ],
    outputs: [{ name: "jobId", type: "uint256" }]
  },
  {
    type: "function",
    name: "acceptJob",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "selfProofRef", type: "bytes" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "submitProofHash",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "proofStage", type: "uint8" },
      { name: "proofHash", type: "bytes32" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "releaseScout",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "releaseArrival",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "releaseHeartbeat",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "releaseCompletion",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "autoReleaseStage",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "proofStage", type: "uint8" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "disputeStage",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "proofStage", type: "uint8" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "settleDispute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "jobId", type: "uint256" },
      { name: "releaseToRunner", type: "bool" }
    ],
    outputs: []
  },
  {
    type: "function",
    name: "refundJob",
    stateMutability: "nonpayable",
    inputs: [{ name: "jobId", type: "uint256" }],
    outputs: []
  },
  {
    type: "function",
    name: "nextJobId",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }]
  },
  {
    type: "function",
    name: "proofHashes",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint8" }
    ],
    outputs: [{ name: "", type: "bytes32" }]
  },
  {
    type: "function",
    name: "proofSubmittedAt",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "uint8" }
    ],
    outputs: [{ name: "", type: "uint64" }]
  },
  {
    type: "function",
    name: "jobs",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [
      { name: "buyer", type: "address" },
      { name: "token", type: "address" },
      { name: "runner", type: "address" },
      { name: "arbiter", type: "address" },
      { name: "scoutFee", type: "uint96" },
      { name: "arrivalFee", type: "uint96" },
      { name: "heartbeatFee", type: "uint96" },
      { name: "completionFee", type: "uint96" },
      { name: "totalAmount", type: "uint96" },
      { name: "expiry", type: "uint64" },
      { name: "detailsHash", type: "bytes32" },
      { name: "lowRiskAutoReleaseWindow", type: "uint32" },
      { name: "disputeWindow", type: "uint32" },
      { name: "heartbeatCount", type: "uint8" },
      { name: "heartbeatsReleased", type: "uint8" },
      { name: "disputedStage", type: "uint8" },
      { name: "stage", type: "uint8" },
      { name: "accepted", type: "bool" },
      { name: "refunded", type: "bool" },
      { name: "scoutReleased", type: "bool" },
      { name: "arrivalReleased", type: "bool" },
      { name: "completionReleased", type: "bool" },
      { name: "disputed", type: "bool" }
    ]
  },
  {
    type: "event",
    name: "JobCreated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: true, name: "buyer", type: "address" },
      { indexed: true, name: "token", type: "address" },
      { indexed: false, name: "totalAmount", type: "uint256" },
      { indexed: false, name: "expiry", type: "uint64" },
      { indexed: false, name: "detailsHash", type: "bytes32" }
    ]
  },
  {
    type: "event",
    name: "JobAccepted",
    anonymous: false,
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: true, name: "runner", type: "address" },
      { indexed: false, name: "selfProofRef", type: "bytes" }
    ]
  },
  {
    type: "event",
    name: "ProofSubmitted",
    anonymous: false,
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: true, name: "proofStage", type: "uint8" },
      { indexed: false, name: "proofHash", type: "bytes32" }
    ]
  },
  {
    type: "event",
    name: "StageReleased",
    anonymous: false,
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: true, name: "stage", type: "uint8" },
      { indexed: true, name: "runner", type: "address" },
      { indexed: false, name: "amount", type: "uint256" }
    ]
  },
  {
    type: "event",
    name: "StageDisputed",
    anonymous: false,
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: true, name: "proofStage", type: "uint8" },
      { indexed: false, name: "buyer", type: "address" }
    ]
  },
  {
    type: "event",
    name: "DisputeSettled",
    anonymous: false,
    inputs: [
      { indexed: true, name: "jobId", type: "uint256" },
      { indexed: true, name: "proofStage", type: "uint8" },
      { indexed: false, name: "releasedToRunner", type: "bool" }
    ]
  }
] as const;

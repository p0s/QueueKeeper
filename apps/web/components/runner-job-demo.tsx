"use client";

import { useState } from "react";
import type { QueueJobView, QueueStageKey } from "@queuekeeper/shared";
import { requestRunnerAcceptance } from "../lib/agent-client";
import { JobTimeline } from "./job-timeline";
import { PolicyCard } from "./policy-card";
import { VerificationCard } from "./verification-card";

const stageLabels: Record<QueueStageKey, string> = {
  scout: "Scout",
  arrival: "Arrival",
  heartbeat: "Heartbeat",
  completion: "Completion"
};

export function RunnerJobDemo({ initialJob, jobId }: { initialJob: QueueJobView; jobId: string }) {
  const [job, setJob] = useState(initialJob);
  const [acceptState, setAcceptState] = useState<string>("Not accepted yet");
  const [proofInputs, setProofInputs] = useState<Record<QueueStageKey, string>>({
    scout: initialJob.stages.find((stage) => stage.key === "scout")?.proofHash ?? "",
    arrival: initialJob.stages.find((stage) => stage.key === "arrival")?.proofHash ?? "",
    heartbeat: "",
    completion: ""
  });

  async function handleAccept() {
    setAcceptState("Checking verification gate…");
    try {
      const accepted = await requestRunnerAcceptance(jobId, true);
      setJob((current) => ({
        ...current,
        status: "accepted",
        exactLocationHint: accepted.acceptanceRecord.exactLocationRevealAllowed ? "Exact location revealed to accepted runner" : current.exactLocationHint,
        currentStage: "Runner accepted. Exact location revealed. Awaiting arrival proof.",
        runnerVerification: {
          ...current.runnerVerification,
          status: "verified",
          reference: accepted.acceptanceRecord.verificationReference,
          provider: accepted.acceptanceRecord.verificationProvider === "mock-self" ? "mock-self" : "self"
        }
      }));
      setAcceptState(`Accepted · verification ref ${accepted.acceptanceRecord.verificationReference}`);
    } catch (error) {
      setAcceptState(error instanceof Error ? error.message : String(error));
    }
  }

  function handleProofSubmit(stageKey: QueueStageKey) {
    const proofHash = proofInputs[stageKey] || `0x${stageKey}-demo-proof`;
    setJob((current) => ({
      ...current,
      currentStage: `${stageLabels[stageKey]} proof submitted`,
      stages: current.stages.map((stage) => stage.key === stageKey
        ? { ...stage, proofHash, timestamp: "demo now" }
        : stage)
    }));
  }

  return (
    <main className="container grid">
      <section className="card">
        <span className="badge">Runner view · mobile first</span>
        <h1>{job.title}</h1>
        <p className="muted">Job #{jobId} · {job.exactLocationHint ?? "Coarse area only before acceptance"}</p>
      </section>
      <VerificationCard verification={job.runnerVerification} />
      <section className="card">
        <h2>Accept job</h2>
        <p className="muted">Backend acceptance uses the Self-compatible verification gate and returns the verification reference used in the acceptance record.</p>
        <button className="button" onClick={handleAccept} type="button">Accept and reveal exact location</button>
        <div className="muted" style={{ marginTop: 10 }}>{acceptState}</div>
      </section>
      <section className="card">
        <h2>Submit proof hashes</h2>
        <div className="grid">
          {(["arrival", "heartbeat", "completion"] as QueueStageKey[]).map((key) => (
            <div key={key} className="grid" style={{ gap: 8 }}>
              <input
                className="input"
                value={proofInputs[key]}
                onChange={(event) => setProofInputs((current) => ({ ...current, [key]: event.target.value }))}
                placeholder={`0x ${key} proof hash`}
              />
              <button className="button" onClick={() => handleProofSubmit(key)} type="button">
                Submit {stageLabels[key]} proof hash
              </button>
            </div>
          ))}
        </div>
      </section>
      <PolicyCard policy={job.policy} />
      <section className="card">
        <h3>What is still private</h3>
        <ul>
          {job.keptPrivate.map((item) => <li key={item}>{item}</li>)}
        </ul>
      </section>
      <JobTimeline job={job} />
    </main>
  );
}

/**
 * Auto-triage for community submissions — reuses problems4us-32 filter only.
 */

import { classifyModeration } from "./ingest-moderation";
import type { SubmissionStatus } from "./types";

export type TriageDecision = {
  status: SubmissionStatus;
  moderationAction: "keep" | "drop_toxic" | "drop_pii";
  reason: string;
};

export function triageSubmissionText(
  title: string,
  description: string
): TriageDecision {
  const action = classifyModeration(`${title}\n${description}`);
  if (action === "drop_toxic") {
    return {
      status: "declined",
      moderationAction: action,
      reason: "Blocked by toxicity filter before publication",
    };
  }
  if (action === "drop_pii") {
    return {
      status: "reviewing",
      moderationAction: action,
      reason: "Queued: possible PII in problem text — admin review required",
    };
  }
  return {
    status: "accepted",
    moderationAction: action,
    reason: "Clean — auto-approved for scoring",
  };
}

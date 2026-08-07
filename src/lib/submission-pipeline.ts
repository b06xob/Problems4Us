/**
 * Community submission journey: triage → score/merge → notify.
 * Reuses ingest-moderation (problems4us-32). Does not invent counts or ranks.
 */

import {
  deliverSubmissionAckVerifyEmail,
  buildSubmissionVerifyUrl,
} from "./submission-email-verify";
import { createSubmissionVerifyTokenDb } from "./submission-verify-db";
import { getAIProvider } from "./ai-service";
import { calculateOpportunityScore } from "./scoring";
import { sendSmtpPlainText } from "./smtp-mail";
import {
  findBestCatalogMatch,
  opportunityPercentileRank,
  type CatalogCandidate,
} from "./submission-match";
import {
  triageSubmissionText,
  type TriageDecision,
} from "./submission-triage";
import type {
  SubmissionUrgency,
  UserProblemSubmission,
} from "./types";
import {
  ensureCommunitySubmissionSource,
  ensureUserSubmissionColumns,
  getUserSubmissionById,
  insertPainPoint,
  insertPainPointMention,
  insertRawPost,
  listPainPoints,
  countMentionsForPainPoint,
  updatePainPointAfterCommunityEvidence,
  updateSubmissionPipelineFields,
} from "./db-service";

export { triageSubmissionText, type TriageDecision };

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://problems4us.com";
const COMMUNITY_SOURCE_ID = "src-community-user-submissions";

function urgencyFrequency(urgency: SubmissionUrgency): number {
  switch (urgency) {
    case "critical":
      return 72;
    case "high":
      return 62;
    case "medium":
      return 52;
    default:
      return 42;
  }
}

function attributionLabel(submission: UserProblemSubmission): string {
  const name = submission.SubmitterName?.trim();
  if (name) return name;
  return "a community submitter";
}

export type ScorePipelineResult = {
  outcome: "standalone" | "merged" | "skipped";
  painPointId: string | null;
  opportunityScore: number | null;
  similarReporterCount: number | null;
  percentileRank: number | null;
  matchScore: number | null;
  error?: string;
};

export async function processApprovedSubmission(
  submissionId: string
): Promise<ScorePipelineResult> {
  await ensureUserSubmissionColumns();
  const submission = await getUserSubmissionById(submissionId);
  if (!submission) {
    return {
      outcome: "skipped",
      painPointId: null,
      opportunityScore: null,
      similarReporterCount: null,
      percentileRank: null,
      matchScore: null,
      error: "Submission not found",
    };
  }
  if (submission.Status !== "accepted") {
    return {
      outcome: "skipped",
      painPointId: submission.LinkedPainPointId ?? null,
      opportunityScore: null,
      similarReporterCount: null,
      percentileRank: null,
      matchScore: null,
      error: `Status is ${submission.Status}, expected accepted`,
    };
  }
  if (!submission.EmailVerifiedAt) {
    return {
      outcome: "skipped",
      painPointId: submission.LinkedPainPointId ?? null,
      opportunityScore: null,
      similarReporterCount: null,
      percentileRank: null,
      matchScore: null,
      error: "Email not verified — cannot publish or score",
    };
  }

  try {
    await ensureCommunitySubmissionSource();

    const { data: catalog } = await listPainPoints({ limit: 5000, status: "active" });
    const candidates: CatalogCandidate[] = catalog.map((pp) => ({
      PainPointId: pp.PainPointId,
      Title: pp.Title,
      Summary: pp.Summary,
      Category: pp.Category,
      OpportunityScore: pp.OpportunityScore,
    }));

    const match = findBestCatalogMatch(
      submission.Title,
      submission.Description,
      submission.Category,
      candidates
    );

    const ai = getAIProvider();
    const severity = await ai.scoreSeverity(submission.Title, submission.Description);
    const wtp = await ai.estimateWillingnessToPay(
      submission.Title,
      submission.Description,
      submission.Category
    );
    const frequency = urgencyFrequency(submission.Urgency);
    const marketSize = 55;
    const trend = 55;
    const opportunityScore = calculateOpportunityScore({
      SeverityScore: severity,
      FrequencyScore: frequency,
      WillingnessToPayScore: wtp,
      MarketSizeScore: marketSize,
      TrendScore: trend,
    });

    const now = new Date().toISOString();
    const rawPostId = `raw-sub-${submission.SubmissionId}`;
    const author = attributionLabel(submission);
    const extracted = `Community submission (${submission.SubmissionId}) by ${author}: ${submission.Title}\n\n${submission.Description}`;

    try {
      await insertRawPost({
        RawPostId: rawPostId,
        SourceId: COMMUNITY_SOURCE_ID,
        ExternalId: submission.SubmissionId,
        Title: submission.Title,
        Body: submission.Description,
        Author: author,
        Url: `${SITE_URL}/submissions`,
        PublishedAt: submission.CreatedAt || now,
      });
    } catch {
      // idempotent re-process
    }

    let painPointId: string;
    let outcome: "standalone" | "merged";
    let similarReporterCount: number;
    let finalOpportunity: number;

    if (match) {
      painPointId = match.painPointId;
      outcome = "merged";
      await updatePainPointAfterCommunityEvidence({
        painPointId,
        frequencyBump: 5,
        lastSeenAt: now,
        severityHint: severity,
      });
      const mentionCount = await countMentionsForPainPoint(painPointId);
      similarReporterCount = Math.max(1, mentionCount);
      const refreshed = catalog.find((c) => c.PainPointId === painPointId);
      finalOpportunity = refreshed?.OpportunityScore ?? match.opportunityScore;
    } else {
      painPointId = `pp-sub-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      outcome = "standalone";
      await insertPainPoint({
        PainPointId: painPointId,
        Title: submission.Title,
        Summary: submission.Description.slice(0, 500),
        Category: submission.Category,
        SeverityScore: severity,
        FrequencyScore: frequency,
        WillingnessToPayScore: wtp,
        MarketSizeScore: marketSize,
        TrendScore: trend,
        OpportunityScore: opportunityScore,
        FirstSeenAt: now,
        LastSeenAt: now,
        Status: "active",
      });
      similarReporterCount = 1;
      finalOpportunity = opportunityScore;
    }

    try {
      await insertPainPointMention({
        MentionId: `men-sub-${submission.SubmissionId}`,
        PainPointId: painPointId,
        RawPostId: rawPostId,
        ExtractedText: extracted,
        SentimentScore: -0.5,
        SeverityScore: severity,
      });
    } catch {
      // idempotent
    }

    if (outcome === "merged") {
      similarReporterCount = await countMentionsForPainPoint(painPointId);
    }

    const allScores = catalog.map((c) => c.OpportunityScore);
    if (outcome === "standalone") allScores.push(finalOpportunity);
    const percentileRank = opportunityPercentileRank(finalOpportunity, allScores);

    await updateSubmissionPipelineFields(submission.SubmissionId, {
      linkedPainPointId: painPointId,
      pipelineOutcome: outcome,
      moderationAction: submission.ModerationAction || "keep",
      moderationReason: submission.ModerationReason || "Clean — auto-approved for scoring",
    });

    return {
      outcome,
      painPointId,
      opportunityScore: finalOpportunity,
      similarReporterCount,
      percentileRank,
      matchScore: match?.score ?? null,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      outcome: "skipped",
      painPointId: null,
      opportunityScore: null,
      similarReporterCount: null,
      percentileRank: null,
      matchScore: null,
      error: message,
    };
  }
}

/**
 * Immediate acknowledgement email — doubles as verification when needed.
 * Always attempts send when an email is present (registered or not).
 */
export async function sendSubmissionConfirmationEmail(
  submission: UserProblemSubmission,
  opts?: { alreadyVerified?: boolean; origin?: string }
): Promise<{ sent: boolean; reason?: string; verifyTokenMinted?: boolean }> {
  const email = submission.SubmitterEmail?.trim();
  if (!email) return { sent: false, reason: "no_email" };

  const alreadyVerified = Boolean(
    opts?.alreadyVerified || submission.EmailVerifiedAt
  );
  const origin =
    opts?.origin?.replace(/\/$/, "") ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    SITE_URL;

  let verifyUrl = `${origin}/verify-submission`;
  let verifyTokenMinted = false;
  if (!alreadyVerified) {
    const minted = await createSubmissionVerifyTokenDb(submission.SubmissionId);
    if (!minted) {
      return { sent: false, reason: "token_mint_failed" };
    }
    verifyUrl = buildSubmissionVerifyUrl(origin, minted.rawToken);
    verifyTokenMinted = true;
  }

  const delivery = await deliverSubmissionAckVerifyEmail({
    toEmail: email,
    submissionId: submission.SubmissionId,
    title: submission.Title,
    verifyUrl,
    alreadyVerified,
  });

  if (delivery.sent) {
    await updateSubmissionPipelineFields(submission.SubmissionId, {
      confirmationEmailSentAt: new Date().toISOString(),
    });
    return { sent: true, verifyTokenMinted };
  }
  return {
    sent: false,
    reason: "reason" in delivery ? delivery.reason : "send_failed",
    verifyTokenMinted,
  };
}

export async function sendSubmissionOutcomeEmail(
  submission: UserProblemSubmission,
  pipeline: ScorePipelineResult
): Promise<{ sent: boolean; reason?: string }> {
  const email = submission.SubmitterEmail?.trim();
  if (!email) return { sent: false, reason: "no_email" };
  if (pipeline.outcome === "skipped" || !pipeline.painPointId) {
    return { sent: false, reason: "no_scored_outcome" };
  }

  const lines: string[] = [
    `Update on your Problems4Us submission ${submission.SubmissionId}`,
    "",
    `Title: ${submission.Title}`,
    "",
  ];

  if (pipeline.outcome === "merged") {
    const others =
      pipeline.similarReporterCount != null && pipeline.similarReporterCount > 1
        ? pipeline.similarReporterCount - 1
        : null;
    lines.push("Your problem is live — and you are not alone.");
    if (others != null && others > 0) {
      lines.push(
        `${others} other${others === 1 ? "" : "s"} reported something similar (corroborating evidence merged into the existing catalog entry).`
      );
    } else {
      lines.push(
        "It was matched to an existing catalog entry as corroborating community evidence."
      );
    }
  } else {
    lines.push("Your problem is live as a new scored opportunity in the catalog.");
  }

  if (pipeline.opportunityScore != null) {
    lines.push(`Opportunity score: ${pipeline.opportunityScore}/100.`);
  }
  if (pipeline.percentileRank != null) {
    const topPct = Math.max(1, 100 - pipeline.percentileRank);
    if (pipeline.percentileRank >= 85) {
      lines.push(
        `It is currently in roughly the top ${topPct}% of scored opportunities.`
      );
    } else {
      lines.push(
        `Among scored opportunities, its percentile rank is about ${pipeline.percentileRank}.`
      );
    }
  }

  lines.push(
    "",
    `View the opportunity: ${SITE_URL}/problems/${pipeline.painPointId}`,
    "",
    "— Problems4Us"
  );

  const result = await sendSmtpPlainText({
    to: email,
    subject: `Your problem is live — ${submission.SubmissionId}`,
    text: lines.join("\n"),
  });

  if (result.sent) {
    await updateSubmissionPipelineFields(submission.SubmissionId, {
      outcomeEmailSentAt: new Date().toISOString(),
    });
    return { sent: true };
  }
  return { sent: false, reason: result.reason };
}

/**
 * Full path after status becomes accepted: score/merge then outcome email.
 */
export async function runAcceptedSubmissionJourney(
  submissionId: string
): Promise<{
  pipeline: ScorePipelineResult;
  outcomeEmail: { sent: boolean; reason?: string };
}> {
  const pipeline = await processApprovedSubmission(submissionId);
  const submission = await getUserSubmissionById(submissionId);
  let outcomeEmail: { sent: boolean; reason?: string } = {
    sent: false,
    reason: "no_submission",
  };
  if (submission && pipeline.outcome !== "skipped") {
    outcomeEmail = await sendSubmissionOutcomeEmail(submission, pipeline);
  }
  return { pipeline, outcomeEmail };
}

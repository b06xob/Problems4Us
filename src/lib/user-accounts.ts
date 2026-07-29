/**
 * Account activation + saved-item helpers (pure; DB in user-db.ts).
 * Activation: saved ≥3 problems OR ≥1 idea.
 */

export type ActivationCounts = {
  savedProblemCount: number;
  savedIdeaCount: number;
};

export type ActivationStatus = {
  activated: boolean;
  reason: "saved_problems_gte_3" | "saved_idea_gte_1" | "not_activated";
  savedProblemCount: number;
  savedIdeaCount: number;
};

export function computeActivation(counts: ActivationCounts): ActivationStatus {
  const savedProblemCount = Math.max(0, Number(counts.savedProblemCount) || 0);
  const savedIdeaCount = Math.max(0, Number(counts.savedIdeaCount) || 0);

  if (savedIdeaCount >= 1) {
    return {
      activated: true,
      reason: "saved_idea_gte_1",
      savedProblemCount,
      savedIdeaCount,
    };
  }
  if (savedProblemCount >= 3) {
    return {
      activated: true,
      reason: "saved_problems_gte_3",
      savedProblemCount,
      savedIdeaCount,
    };
  }
  return {
    activated: false,
    reason: "not_activated",
    savedProblemCount,
    savedIdeaCount,
  };
}

export function isNonEmptyId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim().length <= 80;
}

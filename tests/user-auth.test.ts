/**
 * @jest-environment node
 */
import {
  computeActivation,
  isNonEmptyId,
} from "@/lib/user-accounts";
import {
  hashPassword,
  hashSessionToken,
  isValidPassword,
  mintSessionToken,
  verifyPassword,
} from "@/lib/user-auth";

describe("user-accounts activation", () => {
  it("activates on >=1 saved idea", () => {
    expect(computeActivation({ savedProblemCount: 0, savedIdeaCount: 1 })).toEqual(
      expect.objectContaining({ activated: true, reason: "saved_idea_gte_1" })
    );
  });

  it("activates on >=3 saved problems", () => {
    expect(computeActivation({ savedProblemCount: 3, savedIdeaCount: 0 })).toEqual(
      expect.objectContaining({
        activated: true,
        reason: "saved_problems_gte_3",
      })
    );
  });

  it("does not activate below thresholds", () => {
    expect(computeActivation({ savedProblemCount: 2, savedIdeaCount: 0 })).toEqual(
      expect.objectContaining({ activated: false, reason: "not_activated" })
    );
  });

  it("validates ids", () => {
    expect(isNonEmptyId("pp-1")).toBe(true);
    expect(isNonEmptyId("")).toBe(false);
    expect(isNonEmptyId(null)).toBe(false);
  });
});

describe("user-auth crypto", () => {
  it("hashes and verifies passwords", () => {
    const { salt, hash } = hashPassword("correct-horse");
    expect(verifyPassword("correct-horse", salt, hash)).toBe(true);
    expect(verifyPassword("wrong-password", salt, hash)).toBe(false);
  });

  it("mints opaque session tokens and hashes them", () => {
    process.env.SESSION_SECRET = "test-pepper";
    const a = mintSessionToken();
    const b = mintSessionToken();
    expect(a).not.toEqual(b);
    expect(hashSessionToken(a)).toHaveLength(64);
    expect(hashSessionToken(a)).toEqual(hashSessionToken(a));
    expect(hashSessionToken(a)).not.toEqual(hashSessionToken(b));
  });

  it("enforces password length", () => {
    expect(isValidPassword("short")).toBe(false);
    expect(isValidPassword("long-enough")).toBe(true);
  });
});

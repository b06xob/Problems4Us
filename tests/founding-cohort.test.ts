import {
  decideFoundingCohortCap,
  FOUNDING_BUILDER_MONTHLY_USD,
  FOUNDING_COHORT_CAP,
  foundingPriceLockNote,
} from "@/lib/founding-cohort";

describe("founding cohort (pricing v1.0)", () => {
  it("locks constants to approved strategy", () => {
    expect(FOUNDING_BUILDER_MONTHLY_USD).toBe(29);
    expect(FOUNDING_COHORT_CAP).toBe(25);
    expect(foundingPriceLockNote()).toMatch(/STRIPE_PRICE_BUILDER_MONTHLY/);
  });

  it("allows checkout while under cap", () => {
    expect(decideFoundingCohortCap({ activePaidSeats: 0 })).toEqual({
      ok: true,
      remaining: 25,
    });
    expect(decideFoundingCohortCap({ activePaidSeats: 24 })).toEqual({
      ok: true,
      remaining: 1,
    });
  });

  it("blocks new seats at cap", () => {
    expect(decideFoundingCohortCap({ activePaidSeats: 25 })).toEqual({
      ok: false,
      reason: expect.stringMatching(/full/i),
      activePaidSeats: 25,
    });
  });

  it("allowExisting bypasses cap for renewals", () => {
    expect(
      decideFoundingCohortCap({ activePaidSeats: 25, allowExisting: true })
    ).toEqual({ ok: true, remaining: 0 });
  });
});

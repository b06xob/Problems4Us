/**
 * @jest-environment node
 */
import { shouldEmitScoreAlert } from "@/lib/alerts-db";

describe("shouldEmitScoreAlert", () => {
  it("requires a prior score and threshold move", () => {
    expect(shouldEmitScoreAlert(null, 80)).toBe(false);
    expect(shouldEmitScoreAlert(70, 74)).toBe(false);
    expect(shouldEmitScoreAlert(70, 75)).toBe(true);
    expect(shouldEmitScoreAlert(70, 60)).toBe(true);
  });
});

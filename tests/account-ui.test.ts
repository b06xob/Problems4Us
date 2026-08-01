/**
 * @jest-environment node
 */
import { PUBLIC_RATE_LIMITS } from "@/lib/public-rate-limit";
import { SESSION_POLICY } from "@/lib/user-auth";

describe("account UI surfaces (problems4us-31a)", () => {
  it("exposes auth rate limits including forgot/reset", () => {
    expect(PUBLIC_RATE_LIMITS["auth-login"]).toBeDefined();
    expect(PUBLIC_RATE_LIMITS["auth-forgot"].max).toBe(10);
    expect(PUBLIC_RATE_LIMITS["auth-reset"].max).toBe(15);
  });

  it("keeps session cookie policy for navbar/session hook", () => {
    expect(SESSION_POLICY.cookieName).toBe("p4u_session");
    expect(SESSION_POLICY.ttlDays).toBe(30);
  });
});

/**
 * @jest-environment node
 */
import { resolveBuilderBriefCaller } from "@/lib/builder-brief-auth";

function fakeRequest(headers: Record<string, string> = {}): Request {
  return new Request("https://problems4us.com/api/builder/briefs", {
    headers,
  });
}

describe("resolveBuilderBriefCaller (security review 2026-08-05)", () => {
  const prev = process.env.ADMIN_API_KEY;

  beforeEach(() => {
    process.env.ADMIN_API_KEY = "test-admin-key-value";
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.ADMIN_API_KEY;
    else process.env.ADMIN_API_KEY = prev;
  });

  it("rejects anonymous callers even with a claimed email", () => {
    const result = resolveBuilderBriefCaller({
      request: fakeRequest(),
      sessionUser: null,
      claimedEmail: "pilot@example.com",
    });
    expect(result).toEqual({
      ok: false,
      status: 401,
      error: "Sign in required for Builder brief export",
    });
  });

  it("uses session email and ignores matching claim", () => {
    const result = resolveBuilderBriefCaller({
      request: fakeRequest(),
      sessionUser: { userId: "u1", email: "Pilot@Example.com" },
      claimedEmail: "pilot@example.com",
    });
    expect(result).toEqual({
      ok: true,
      email: "pilot@example.com",
      via: "session",
    });
  });

  it("rejects session when claimed email mismatches", () => {
    const result = resolveBuilderBriefCaller({
      request: fakeRequest(),
      sessionUser: { userId: "u1", email: "pilot@example.com" },
      claimedEmail: "other@example.com",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(403);
  });

  it("allows ADMIN_API_KEY to target a claimed email", () => {
    const result = resolveBuilderBriefCaller({
      request: fakeRequest({ "x-admin-api-key": "test-admin-key-value" }),
      sessionUser: null,
      claimedEmail: "Pilot@Example.com",
    });
    expect(result).toEqual({
      ok: true,
      email: "pilot@example.com",
      via: "admin",
    });
  });

  it("admin without valid email fails closed", () => {
    const result = resolveBuilderBriefCaller({
      request: fakeRequest({ "x-admin-api-key": "test-admin-key-value" }),
      sessionUser: null,
      claimedEmail: "",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });
});

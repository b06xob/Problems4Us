import {
  buildBriefShareApiPath,
  buildBriefShareAudit,
  buildBriefSharePath,
  buildBriefShareUrl,
  createBriefShareToken,
  getBriefShareSecret,
  verifyBriefShareToken,
} from "@/lib/brief-share";

describe("brief share links (M3.1)", () => {
  const secret = "test-brief-share-secret";
  const nowMs = Date.UTC(2026, 6, 18, 16, 45, 0); // 2026-07-18T16:45:00Z

  beforeEach(() => {
    delete process.env.BRIEF_SHARE_SECRET;
    delete process.env.ADMIN_API_KEY;
  });

  it("resolves BRIEF_SHARE_SECRET over ADMIN_API_KEY", () => {
    process.env.ADMIN_API_KEY = "admin-key";
    process.env.BRIEF_SHARE_SECRET = "share-key";
    expect(getBriefShareSecret()).toBe("share-key");
  });

  it("falls back to ADMIN_API_KEY when dedicated secret unset", () => {
    process.env.ADMIN_API_KEY = "admin-key";
    expect(getBriefShareSecret()).toBe("admin-key");
  });

  it("returns null when no share secret configured", () => {
    expect(getBriefShareSecret()).toBeNull();
  });

  it("mints and verifies a token for a problem id", () => {
    const token = createBriefShareToken({
      problemId: "pp-invoice-1",
      secret,
      nowMs,
      ttlSeconds: 3600,
    });
    expect(token).toMatch(/^v1\./);
    const verified = verifyBriefShareToken(token, secret, nowMs + 1000);
    expect(verified).toEqual({
      ok: true,
      problemId: "pp-invoice-1",
      exp: Math.floor(nowMs / 1000) + 3600,
    });
  });

  it("rejects tampered tokens and expired tokens", () => {
    const token = createBriefShareToken({
      problemId: "pp-1",
      secret,
      nowMs,
      ttlSeconds: 60,
    })!;
    expect(verifyBriefShareToken(token + "x", secret, nowMs).ok).toBe(false);
    expect(
      verifyBriefShareToken(token, secret, nowMs + 120_000).ok
    ).toBe(false);
    expect(verifyBriefShareToken("", secret, nowMs).ok).toBe(false);
  });

  it("builds human share page path and absolute url", () => {
    const token = "v1.abc.def";
    expect(buildBriefSharePath(token)).toBe(
      "/share/briefs?token=v1.abc.def"
    );
    expect(buildBriefShareApiPath(token)).toBe(
      "/api/share/briefs?token=v1.abc.def"
    );
    expect(buildBriefShareUrl(token, "https://problems4us.com/")).toBe(
      "https://problems4us.com/share/briefs?token=v1.abc.def"
    );
    expect(buildBriefShareUrl(token, null)).toBe(
      "/share/briefs?token=v1.abc.def"
    );
  });

  it("builds share audit props", () => {
    expect(
      buildBriefShareAudit({
        email: "  Builder@Example.COM ",
        problemId: "pp-1",
        expiresAt: 1_752_854_700,
      })
    ).toEqual({
      email: "builder@example.com",
      problemId: "pp-1",
      expiresAt: 1_752_854_700,
    });
    expect(
      buildBriefShareAudit({ email: "", problemId: "pp-1", expiresAt: 1 })
    ).toBeNull();
  });
});

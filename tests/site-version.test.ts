import { formatSiteVersion, getSiteVersion } from "@/lib/site-version";

describe("site-version", () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env = { ...original };
  });

  it("formats version as vYYYY.MM.DD-shortSha", () => {
    expect(formatSiteVersion("2026.07.28", "5a7694e")).toBe("v2026.07.28-5a7694e");
  });

  it("reads build-injected public env vars", () => {
    process.env.NEXT_PUBLIC_APP_VERSION = "v2026.07.28-abc1234";
    process.env.NEXT_PUBLIC_GIT_COMMIT = "abc1234deadbeef0000000000000000000000000";
    process.env.NEXT_PUBLIC_DEPLOYED_AT = "2026-07-28T18:20:00Z";

    expect(getSiteVersion()).toEqual({
      version: "v2026.07.28-abc1234",
      commit: "abc1234deadbeef0000000000000000000000000",
      deployedAt: "2026-07-28T18:20:00Z",
    });
  });

  it("falls back for local/dev when env is unset", () => {
    delete process.env.NEXT_PUBLIC_APP_VERSION;
    delete process.env.NEXT_PUBLIC_GIT_COMMIT;
    delete process.env.NEXT_PUBLIC_DEPLOYED_AT;
    delete process.env.APP_VERSION;
    delete process.env.GIT_COMMIT;
    delete process.env.DEPLOYED_AT;

    expect(getSiteVersion()).toEqual({
      version: "vlocal-local",
      commit: "local",
      deployedAt: "",
    });
  });
});

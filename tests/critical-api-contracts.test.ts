/**
 * @jest-environment node
 */
/** problems4us-17b — critical API contract helpers (auth, checkout, ranking, admin). */
import { NextRequest } from "next/server";
import { requireAdminAuth, ADMIN_API_KEY_HEADER } from "@/lib/admin-auth";
import {
  extractSessionToken,
  unauthorizedJson,
  SESSION_COOKIE,
} from "@/lib/user-auth";
import { getStripeCheckoutPublicStatus } from "@/lib/stripe-checkout";
import {
  XPS_RANKING_CONTRACT_VERSION,
  mapOpportunityToXpsFacets,
} from "@/lib/xps-ranking-map";

describe("critical API contracts (problems4us-17b)", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it("admin routes fail closed when ADMIN_API_KEY unset", () => {
    delete process.env.ADMIN_API_KEY;
    const req = new NextRequest("http://localhost/api/admin/activation");
    expect(requireAdminAuth(req)?.status).toBe(503);
  });

  it("admin routes reject wrong keys", () => {
    process.env.ADMIN_API_KEY = "expected-key";
    const headers = new Headers();
    headers.set(ADMIN_API_KEY_HEADER, "wrong");
    const req = new NextRequest("http://localhost/api/admin/activation", {
      headers,
    });
    expect(requireAdminAuth(req)?.status).toBe(401);
  });

  it("auth session helper returns null without cookie and unauthorized is 401", () => {
    const req = new NextRequest("http://localhost/api/me/watches");
    expect(extractSessionToken(req)).toBeNull();
    expect(unauthorizedJson().status).toBe(401);
  });

  it("extracts session token from cookie", () => {
    const headers = new Headers();
    headers.set("cookie", `${SESSION_COOKIE}=sess_test_token; Path=/`);
    const req = new NextRequest("http://localhost/api/me/alerts", { headers });
    expect(extractSessionToken(req)).toBe("sess_test_token");
  });

  it("checkout public status booleans are false without Stripe secrets", () => {
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_PRICE_BUILDER_MONTHLY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
    delete process.env.BREIVAX_BILLING_FORWARD_SECRET;
    const status = getStripeCheckoutPublicStatus();
    expect(status.gate).toBe("G7");
    expect(status.sessionConfigured).toBe(false);
    expect(status.webhookConfigured).toBe(false);
    expect(status.billingForwardConfigured).toBe(false);
    expect(status.checkoutReady).toBe(false);
  });

  it("ranking mapper pins contractVersion and facet keys", () => {
    expect(XPS_RANKING_CONTRACT_VERSION).toBe("1.0.0-draft");
    const mapped = mapOpportunityToXpsFacets({
      FrequencyScore: 80,
      SeverityScore: 70,
      WillingnessToPayScore: 90,
      TrendScore: 60,
      MarketSizeScore: 50,
    });
    expect(mapped).toEqual(
      expect.objectContaining({
        relevance: expect.objectContaining({ status: "live" }),
        quality: expect.objectContaining({ status: "live" }),
        novelty: expect.objectContaining({ status: "live" }),
        risk: expect.objectContaining({ status: "live" }),
        composite: expect.objectContaining({ status: "live" }),
      })
    );
    for (const key of [
      "relevance",
      "quality",
      "novelty",
      "risk",
      "composite",
    ] as const) {
      expect(typeof mapped[key].value).toBe("number");
      expect(mapped[key].value!).toBeGreaterThanOrEqual(0);
      expect(mapped[key].value!).toBeLessThanOrEqual(1);
    }
  });
});

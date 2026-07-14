/**
 * @jest-environment node
 */
import { NextRequest } from "next/server";
import {
  ADMIN_API_KEY_HEADER,
  extractAdminApiKey,
  isAdminRequest,
  requireAdminAuth,
} from "@/lib/admin-auth";

describe("admin-auth", () => {
  const originalKey = process.env.ADMIN_API_KEY;

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.ADMIN_API_KEY;
    } else {
      process.env.ADMIN_API_KEY = originalKey;
    }
  });

  function requestWithKey(key?: string, bearer?: string): NextRequest {
    const headers = new Headers();
    if (key) headers.set(ADMIN_API_KEY_HEADER, key);
    if (bearer) headers.set("authorization", `Bearer ${bearer}`);
    return new NextRequest("http://localhost/api/sources", { headers });
  }

  it("rejects when ADMIN_API_KEY is not configured", () => {
    delete process.env.ADMIN_API_KEY;
    const result = requireAdminAuth(requestWithKey("anything"));
    expect(result?.status).toBe(503);
  });

  it("rejects missing or wrong keys", () => {
    process.env.ADMIN_API_KEY = "correct-secret";
    expect(requireAdminAuth(requestWithKey())?.status).toBe(401);
    expect(requireAdminAuth(requestWithKey("wrong-secret"))?.status).toBe(401);
  });

  it("accepts matching x-admin-api-key and Bearer tokens", () => {
    process.env.ADMIN_API_KEY = "correct-secret";
    expect(requireAdminAuth(requestWithKey("correct-secret"))).toBeNull();
    expect(requireAdminAuth(requestWithKey(undefined, "correct-secret"))).toBeNull();
    expect(isAdminRequest(requestWithKey("correct-secret"))).toBe(true);
  });

  it("extracts keys from supported headers", () => {
    expect(extractAdminApiKey(requestWithKey("from-header"))).toBe("from-header");
    expect(extractAdminApiKey(requestWithKey(undefined, "from-bearer"))).toBe(
      "from-bearer"
    );
  });
});

import { NextResponse } from "next/server";
import { checkDbConnection } from "@/lib/db";
import { resolveAiProviderName } from "@/lib/ai-analyze";
import { getStripeCheckoutPublicStatus } from "@/lib/stripe-checkout";
import { getPublicOpsFlags } from "@/lib/ops-readiness";

export async function GET() {
  const dbConnected = await checkDbConnection();
  const aiProvider = resolveAiProviderName();
  const checkout = getStripeCheckoutPublicStatus();
  const ops = getPublicOpsFlags();

  return NextResponse.json({
    status: dbConnected ? "healthy" : "degraded",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    database: dbConnected ? "connected" : "disconnected",
    aiProvider,
    checkout,
    ops,
  });
}

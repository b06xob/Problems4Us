import { NextResponse } from "next/server";
import { checkDbConnection } from "@/lib/db";
import { resolveAiProviderName } from "@/lib/ai-analyze";
import { getStripeCheckoutPublicStatus } from "@/lib/stripe-checkout";

export async function GET() {
  const dbConnected = await checkDbConnection();
  const aiProvider = resolveAiProviderName();
  const checkout = getStripeCheckoutPublicStatus();

  return NextResponse.json({
    status: dbConnected ? "healthy" : "degraded",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
    database: dbConnected ? "connected" : "disconnected",
    aiProvider,
    checkout,
  });
}

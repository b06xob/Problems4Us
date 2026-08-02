import { NextRequest, NextResponse } from "next/server";
import { requireAdminAuth } from "@/lib/admin-auth";
import {
  buildLedgerSummary,
  listIngestDailyReceipts,
  normalizeReceiptInput,
  upsertIngestDailyReceipt,
} from "@/lib/ingest-daily-receipt";

/**
 * Passport-readable unattended daily ingest ledger (problems4us-11e).
 * GET  /api/admin/ingest-daily?limit=14
 * POST /api/admin/ingest-daily  — scheduled job posts one receipt per UTC day
 */
export async function GET(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const limitParam = request.nextUrl.searchParams.get("limit");
    const limit = limitParam ? Number(limitParam) : 14;
    const day = request.nextUrl.searchParams.get("day") ?? undefined;
    const records = await listIngestDailyReceipts(limit, day);
    const ledger = buildLedgerSummary(records, 3);
    return NextResponse.json({
      ok: true,
      stepId: "problems4us-11e",
      ledger,
      records,
      // Passport/agent wake: publish Warning+ when escalateWarningToPassport is true
      escalateWarning: ledger.escalateWarning,
    });
  } catch (error) {
    console.error("ingest-daily GET failed:", error);
    return NextResponse.json(
      { error: "Failed to load ingest daily ledger" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const unauthorized = requireAdminAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    const normalized = normalizeReceiptInput(body as Parameters<
      typeof normalizeReceiptInput
    >[0]);
    if (!normalized.ok) {
      return NextResponse.json({ error: normalized.error }, { status: 400 });
    }

    const record = await upsertIngestDailyReceipt(normalized.value);
    const recent = await listIngestDailyReceipts(14);
    const ledger = buildLedgerSummary(recent, 3);

    return NextResponse.json({
      ok: true,
      stepId: "problems4us-11e",
      record,
      ledger,
      escalateWarning:
        ledger.escalateWarning ??
        (!normalized.value.passed
          ? "Scheduled daily ingest below 60% this day — escalate Warning+ to Passport if consecutive failures persist."
          : null),
    });
  } catch (error) {
    console.error("ingest-daily POST failed:", error);
    return NextResponse.json(
      { error: "Failed to store ingest daily receipt" },
      { status: 500 }
    );
  }
}

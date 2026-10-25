import { connectDB } from "@/lib/db/connect";
import { jsonError } from "@/lib/api/http";
import { requireAdminApi } from "@/lib/auth/require-admin-api";
import { withSecurityHeaders } from "@/lib/security/headers";
import { parseEnumParam } from "@/lib/security/sanitize";
import Outing from "@/models/Outing";
import Transaction from "@/models/Transaction";
import ExpenseAllocation from "@/models/ExpenseAllocation";
import { getSettlementLedger } from "@/lib/services/ledger";
import { formatPKR, rupeesFromPaisa } from "@/lib/money";

function toCsv(rows) {
  if (!rows.length) {
    return "";
  }
  const headers = Object.keys(rows[0]);
  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(
      headers
        .map((h) => {
          const val = row[h] ?? "";
          const str = String(val).replace(/"/g, '""');
          return `"${str}"`;
        })
        .join(","),
    );
  }
  return lines.join("\n");
}

const EXPORT_TYPES = ["outings", "transactions", "allocations", "settlements"];

export async function GET(request) {
  const denied = await requireAdminApi();
  if (denied) {
    return denied;
  }
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const type =
      parseEnumParam(searchParams.get("type") || "outings", EXPORT_TYPES, "type") ||
      "outings";

    let csv = "";
    let filename = "export.csv";

    if (type === "outings") {
      const outings = await Outing.find().sort({ weekNumber: -1 }).lean();
      const rows = outings.map((o) => ({
        id: o._id,
        weekNumber: o.weekNumber,
        date: o.actualDate || o.scheduledDate || "",
        venue: o.venueNameSnapshot,
        paymentSystem: o.paymentSystem,
        status: o.status,
        sharedBillPKR: rupeesFromPaisa(o.sharedBillPaisa),
        host: o.hostMemberNameSnapshot,
      }));
      csv = toCsv(rows);
      filename = "outings.csv";
    } else if (type === "transactions") {
      const txs = await Transaction.find().sort({ transactionDate: -1 }).lean();
      const rows = txs.map((t) => ({
        id: t._id,
        type: t.type,
        amountPKR: rupeesFromPaisa(t.amountPaisa),
        payer: t.payerNameSnapshot,
        recipient: t.recipientNameSnapshot,
        date: t.transactionDate,
        outingId: t.outingId || "",
        affectsSettlement: t.affectsSettlement,
      }));
      csv = toCsv(rows);
      filename = "transactions.csv";
    } else if (type === "allocations") {
      const allocations = await ExpenseAllocation.find().lean();
      const rows = allocations.map((a) => ({
        outingId: a.outingId,
        participant: a.participantNameSnapshot,
        kind: a.participantKind,
        type: a.allocationType,
        amountPKR: rupeesFromPaisa(a.amountPaisa),
      }));
      csv = toCsv(rows);
      filename = "allocations.csv";
    } else if (type === "settlements") {
      const ledger = await getSettlementLedger();
      const rows = ledger.balances.map((b) => ({
        name: b.name,
        kind: b.kind,
        paid: rupeesFromPaisa(b.paidOnBehalfPaisa),
        share: rupeesFromPaisa(b.personalSharePaisa),
        transfersIn: rupeesFromPaisa(b.transfersReceivedPaisa),
        transfersOut: rupeesFromPaisa(b.transfersSentPaisa),
        adjustments: rupeesFromPaisa(b.adjustmentsPaisa),
        net: rupeesFromPaisa(b.netBalancePaisa),
        netFormatted: formatPKR(b.netBalancePaisa),
      }));
      csv = toCsv(rows);
      filename = "settlements.csv";
    } else {
      return jsonError("Unknown export type", 400);
    }

    return new Response(csv, {
      headers: withSecurityHeaders({
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      }),
    });
  } catch (err) {
    if (err?.message?.startsWith("Invalid ")) {
      return jsonError(err.message, 400);
    }
    console.error(err);
    return jsonError("Export failed", 500);
  }
}

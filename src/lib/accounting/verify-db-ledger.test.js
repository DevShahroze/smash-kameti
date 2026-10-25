import { describe, it, expect } from "vitest";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });
config({ path: resolve(process.cwd(), ".env") });

const hasDb =
  Boolean(process.env.MONGODB_URI) &&
  process.env.SMASH_KAMETI_DB_TEST === "1";

describe.skipIf(!hasDb)("DB ledger vs outings", () => {
  it("kameti transfers match rebuilt ledger from stored outings", async () => {
    const { connectDB } = await import("@/lib/db/connect");
    const Outing = (await import("@/models/Outing")).default;
    const ExpenseAllocation = (await import("@/models/ExpenseAllocation"))
      .default;
    const { getSettlementLedger } = await import("@/lib/services/ledger");
    const { SETTLEMENT_SCOPE, computeSettlementTransfers } = await import(
      "@/lib/accounting/settlement-scopes"
    );
    const { buildKametiAllocations } = await import("@/lib/accounting/american");
    const Member = (await import("@/models/Member")).default;
    const Transaction = (await import("@/models/Transaction")).default;
    const { PAYMENT_SYSTEMS } = await import("@/lib/constants");
    const mongoose = (await import("mongoose")).default;

    await connectDB();

    const outings = await Outing.find({
      paymentSystem: PAYMENT_SYSTEMS.KAMETI,
      status: "completed",
    }).lean();

    const umar = await Member.findOne({
      $or: [{ nickname: /umar/i }, { fullName: /umar/i }],
    }).lean();

    for (const o of outings) {
      const row = (o.attendance || []).find(
        (a) => umar && String(a.memberId) === String(umar._id),
      );
      console.log(
        `week ${o.weekNumber} host ${o.hostMemberNameSnapshot} umar paysShare=${row?.paysShare} status=${row?.status}`,
      );
    }

    const ledger = await getSettlementLedger({ resync: true });
    const kametiTransfers = ledger.kameti.transfers;

    const members = await Member.find().lean();
    const participants = members.map((m) => ({
      kind: "member",
      id: m._id,
      name: m.nickname || m.fullName,
    }));

    const allocations = await ExpenseAllocation.find().lean();
    const transactions = await Transaction.find().lean();
    const kametiAllocs = allocations.filter((a) => {
      const o = outings.find((x) => String(x._id) === String(a.outingId));
      return o && a.allocationType === "kameti_shared";
    });
    const umarKameti = umar
      ? kametiAllocs.filter((a) => String(a.participantId) === String(umar._id))
      : [];
    console.log("Umar kameti_shared rows:", umarKameti.length);
    for (const a of umarKameti) {
      const o = outings.find((x) => String(x._id) === String(a.outingId));
      console.log(`  week ${o?.weekNumber} share ${a.amountPaisa / 100}`);
    }

    console.log("Kameti transfers:");
    for (const t of kametiTransfers) {
      console.log(
        `  ${t.fromName} -> ${t.toName}: ${(t.amountPaisa / 100).toFixed(2)}`,
      );
    }

    expect(kametiTransfers.length).toBeGreaterThan(0);

    const week4 = outings.find((o) => o.weekNumber === 4);
    if (week4 && umar) {
      const w4NoUmar = (week4.attendance || []).map((row) =>
        String(row.memberId) === String(umar._id)
          ? { ...row, paysShare: false }
          : row,
      );
      const simAlloc = buildKametiAllocations({
        outingId: week4._id,
        sharedBillPaisa: week4.sharedBillPaisa,
        attendance: w4NoUmar,
        parcels: week4.parcels || [],
      });
      const umarSim = simAlloc.find(
        (a) =>
          a.allocationType === "kameti_shared" &&
          String(a.participantId) === String(umar._id),
      );
      console.log(
        "SIM week 4 if Umar paysShare=false: Umar kameti_shared rows",
        umarSim ? umarSim.amountPaisa / 100 : 0,
      );
      const otherOutings = outings.filter((o) => o.weekNumber !== 4);
      let allocs = simAlloc;
      const txs = [];
      for (const o of otherOutings) {
        const a = buildKametiAllocations({
          outingId: o._id,
          sharedBillPaisa: o.sharedBillPaisa,
          attendance: o.attendance || [],
          parcels: o.parcels || [],
        });
        allocs = [...allocs, ...a];
        const hostId = String(o.hostMemberId);
        txs.push({
          type: "restaurant_bill",
          amountPaisa: o.sharedBillPaisa,
          payerKind: "member",
          payerId: hostId,
          payerNameSnapshot: o.hostMemberNameSnapshot,
          affectsSettlement: true,
          outingId: o._id,
        });
      }
      txs.push({
        type: "restaurant_bill",
        amountPaisa: week4.sharedBillPaisa,
        payerKind: "member",
        payerId: String(week4.hostMemberId),
        payerNameSnapshot: week4.hostMemberNameSnapshot,
        affectsSettlement: true,
        outingId: week4._id,
      });
      const outingPaymentById = new Map(
        outings.map((o) => [String(o._id), PAYMENT_SYSTEMS.KAMETI]),
      );
      const simTransfers = computeSettlementTransfers({
        scope: SETTLEMENT_SCOPE.KAMETI,
        allocations: allocs,
        transactions: txs,
        participants,
        settlementContext: {
          outingPaymentById,
          outingRotationByOutingId: new Map(
            outings.map((o) => [String(o._id), "rot"]),
          ),
          settlementsIncludedByRotationId: new Map([["rot", true]]),
          settlementsIncludedByOutingId: new Map(
            outings.map((o) => [String(o._id), true]),
          ),
          outingHostByOutingId: new Map(
            outings.map((o) => [String(o._id), String(o.hostMemberId)]),
          ),
        },
      });
      console.log("SIM Kameti transfers (Umar paysShare=false on week 4 only):");
      for (const t of simTransfers) {
        console.log(
          `  ${t.fromName} -> ${t.toName}: ${(t.amountPaisa / 100).toFixed(2)}`,
        );
      }
    }

    await mongoose.disconnect();
  }, 60000);
});

import { describe, it } from "vitest";
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env.local") });

const hasDb =
  Boolean(process.env.MONGODB_URI) &&
  process.env.SMASH_KAMETI_DB_TEST === "1";

describe.skipIf(!hasDb)("kitty american audit", () => {
  it("dumps outings allocations and american transfers", async () => {
    const { connectDB } = await import("@/lib/db/connect");
    const Outing = (await import("@/models/Outing")).default;
    const ExpenseAllocation = (await import("@/models/ExpenseAllocation"))
      .default;
    const Transaction = (await import("@/models/Transaction")).default;
    const { getSettlementLedger } = await import("@/lib/services/ledger");
    const { PAYMENT_SYSTEMS } = await import("@/lib/constants");
    const { computeBalances, balancesToArray } = await import(
      "@/lib/accounting/balances"
    );
    const {
      filterAllocationsForScope,
      filterTransactionsForScope,
      SETTLEMENT_SCOPE,
    } = await import("@/lib/accounting/settlement-scopes");
    const Member = (await import("@/models/Member")).default;

    await connectDB();
    await getSettlementLedger({ resync: true });

    const members = await Member.find().lean();
    const name = (id) => {
      const m = members.find((x) => String(x._id) === String(id));
      return m?.nickname || m?.fullName || String(id);
    };

    const american = await Outing.find({
      paymentSystem: PAYMENT_SYSTEMS.AMERICAN,
      status: "completed",
    }).lean();

    console.log("\n=== AMERICAN OUTINGS ===");
    for (const o of american) {
      console.log({
        id: String(o._id),
        title: o.title,
        date: o.actualDate,
        sharedBillPaisa: o.sharedBillPaisa,
        chargeable: (o.chargeableParticipants || []).map((p) => p.nameSnapshot),
        parcels: (o.parcels || []).map((p) => ({
          rs: (p.amountPaisa || 0) / 100,
          orderedBy: p.orderedBy?.nameSnapshot,
          paidBy: p.paidBy?.nameSnapshot,
        })),
        payments: (o.payments || []).map((p) => ({
          rs: p.amountPaisa / 100,
          paidBy: p.paidBy?.nameSnapshot,
        })),
      });
    }

    const recent = await Outing.find({
      status: "completed",
      settlementsIncluded: { $ne: false },
    })
      .sort({ actualDate: -1 })
      .limit(15)
      .lean();

    console.log("\n=== RECENT OUTINGS WITH PARCELS ===");
    for (const o of recent) {
      if (!(o.parcels || []).length && o.paymentSystem !== PAYMENT_SYSTEMS.AMERICAN) {
        continue;
      }
      console.log({
        system: o.paymentSystem,
        title: o.title,
        week: o.weekNumber,
        date: o.actualDate,
        sharedRs: (o.sharedBillPaisa || 0) / 100,
        parcels: (o.parcels || []).map((p) => ({
          rs: (p.amountPaisa || 0) / 100,
          orderedBy: p.orderedBy?.nameSnapshot,
          paidBy: p.paidBy?.nameSnapshot,
        })),
      });
    }

    const allocations = await ExpenseAllocation.find().lean();
    const transactions = await Transaction.find().lean();

    const { buildSettlementContext } = await import("@/lib/services/ledger");
    const settlementContext = await buildSettlementContext();
    const ledger = await getSettlementLedger({ resync: false });

    console.log("\n=== APP AMERICAN TRANSFERS ===");
    for (const t of ledger.american.transfers) {
      console.log(
        `${t.fromName} -> ${t.toName}: ${(t.amountPaisa / 100).toFixed(2)}`,
      );
    }

    const americanOuting = american[0];
    if (americanOuting) {
      const chargeable = (americanOuting.chargeableParticipants || []).map(
        (p) => p.nameSnapshot,
      );
      const hasUmar = chargeable.some((n) => /umar/i.test(n));
      const hasWaqas = chargeable.some((n) => /waqas/i.test(n));
      const hasSaqib = chargeable.some((n) => /saqib/i.test(n));
      console.log("\n=== AMERICAN OUTING CHARGEABLE CHECK (Kitty dinner) ===");
      console.log(
        "Kitty dinner: everyone except Saqib and Waqas (Umar should be chargeable).",
      );
      console.log("DB chargeable:", chargeable.join(", "));
      if (!hasUmar || hasWaqas || hasSaqib) {
        console.log(
          "MISMATCH: fix Outing chargeable members — remove Waqas (and Saqib if listed), add Umar Sultan.",
        );
      }
    }

    const scopedA = filterAllocationsForScope(
      allocations,
      SETTLEMENT_SCOPE.AMERICAN,
      settlementContext,
    );
    const scopedT = filterTransactionsForScope(
      transactions,
      SETTLEMENT_SCOPE.AMERICAN,
      settlementContext,
    );
    const participants = members.map((m) => ({
      kind: "member",
      id: m._id,
      name: m.nickname || m.fullName,
    }));
    const rows = balancesToArray(
      computeBalances({
        allocations: scopedA,
        transactions: scopedT,
        participants,
      }),
    );
    console.log("\n=== AMERICAN SCOPE NET BALANCES (members) ===");
    for (const r of rows.filter((x) => x.kind === "member" && x.netBalancePaisa !== 0)) {
      console.log(
        `${r.name}: ${(r.netBalancePaisa / 100).toFixed(2)} (${r.netBalancePaisa > 0 ? "receives" : "owes"})`,
      );
    }

    console.log("\n=== KITTY-STYLE GROSS (american_shared + american_parcel in scope) ===");
    const gross = new Map();
    function addGross(fromId, fromName, toId, toName, paisa, label) {
      const key = `${fromName}|${toName}`;
      const cur = gross.get(key) || { fromName, toName, paisa: 0, labels: [] };
      cur.paisa += paisa;
      cur.labels.push(label);
      gross.set(key, cur);
    }

    for (const a of scopedA) {
      if (a.allocationType === "american_shared") {
        const tx = scopedT.find(
          (t) =>
            String(t.outingId) === String(a.outingId) &&
            t.notes !== "Parcel payment",
        );
        if (!tx) {
          console.log("NO TX for shared", a.participantNameSnapshot, a.outingId);
          continue;
        }
        addGross(
          a.participantId,
          a.participantNameSnapshot,
          tx.payerId,
          tx.payerNameSnapshot,
          a.amountPaisa,
          `shared ${(a.amountPaisa / 100).toFixed(2)}`,
        );
      }
      if (a.allocationType === "american_parcel") {
        const oid = String(a.outingId);
        const parcels =
          settlementContext.parcelsByOutingId?.get(oid) || [];
        const row = a.parcelId
          ? parcels.find((p) => String(p._id) === String(a.parcelId))
          : null;
        const pb = row?.paidBy;
        if (!pb?.refId) {
          const pt = scopedT.find(
            (t) =>
              String(t.outingId) === oid &&
              t.notes === "Parcel payment" &&
              t.amountPaisa === a.amountPaisa,
          );
          if (pt) {
            addGross(
              a.participantId,
              a.participantNameSnapshot,
              pt.payerId,
              pt.payerNameSnapshot,
              a.amountPaisa,
              `parcel ${(a.amountPaisa / 100).toFixed(2)}`,
            );
          } else {
            console.log("NO paidBy for parcel", a.participantNameSnapshot, oid, a.amountPaisa);
          }
        } else {
          addGross(
            a.participantId,
            a.participantNameSnapshot,
            pb.refId,
            pb.nameSnapshot,
            a.amountPaisa,
            `parcel ${(a.amountPaisa / 100).toFixed(2)}`,
          );
        }
      }
    }
    for (const g of [...gross.values()].sort((a, b) =>
      a.fromName.localeCompare(b.fromName),
    )) {
      console.log(
        `${g.fromName} -> ${g.toName}: ${(g.paisa / 100).toFixed(2)} [${g.labels.join("; ")}]`,
      );
    }

    console.log("\n=== OUTSTANDING american_parcel allocs (no paidBy in outing) ===");
    for (const a of scopedA.filter((x) => x.allocationType === "american_parcel")) {
      const oid = String(a.outingId);
      const parcels = settlementContext.parcelsByOutingId?.get(oid) || [];
      const row = a.parcelId
        ? parcels.find((p) => String(p._id) === String(a.parcelId))
        : null;
      if (!row?.paidBy?.refId) {
        const o = recent.find((x) => String(x._id) === oid);
        console.log({
          debtor: a.participantNameSnapshot,
          rs: a.amountPaisa / 100,
          outing: o?.title || oid,
          week: o?.weekNumber,
          parcelInOuting: row,
        });
      }
    }
  }, 120_000);
});
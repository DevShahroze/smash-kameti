import { describe, it, expect } from "vitest";
import { splitEqually, paisaFromRupees, participantKey } from "@/lib/money";
import {
  buildAmericanAllocations,
  buildKametiAllocations,
} from "@/lib/accounting/american";
import {
  computeSettlementTransfers,
  filterAllocationsForScope,
  filterTransactionsForScope,
  SETTLEMENT_SCOPE,
} from "@/lib/accounting/settlement-scopes";
import { PAYMENT_SYSTEMS } from "@/lib/constants";
import {
  computeBalances,
  balancesToArray,
  sumNetBalances,
} from "@/lib/accounting/balances";
import { recommendTransfers } from "@/lib/accounting/settlement";
import { TRANSACTION_TYPES } from "@/lib/constants";

const m = (id, name) => ({
  kind: "member",
  id,
  name,
});

describe("splitEqually", () => {
  it("splits with deterministic remainder", () => {
    const keys = [participantKey("member", "b"), participantKey("member", "a")];
    const shares = splitEqually(10001, keys);
    const total = Object.values(shares).reduce((s, v) => s + v, 0);
    expect(total).toBe(10001);
  });
});

describe("American allocations", () => {
  it("excludes non-chargeable guests from shared split", () => {
    const allocations = buildAmericanAllocations({
      outingId: "o1",
      sharedBillPaisa: paisaFromRupees(10000),
      chargeableParticipants: [
        { kind: "member", refId: "a", nameSnapshot: "A" },
        { kind: "member", refId: "b", nameSnapshot: "B" },
        { kind: "member", refId: "c", nameSnapshot: "C" },
        { kind: "member", refId: "d", nameSnapshot: "D" },
      ],
      parcels: [],
    });
    const sum = allocations.reduce((s, a) => s + a.amountPaisa, 0);
    expect(sum).toBe(paisaFromRupees(10000));
    expect(allocations.every((a) => a.amountPaisa === paisaFromRupees(2500))).toBe(
      true,
    );
  });

  it("skips settlement entries when parcel orderer paid for it themselves", () => {
    const allocations = buildAmericanAllocations({
      outingId: "o1",
      sharedBillPaisa: 0,
      chargeableParticipants: [],
      parcels: [
        {
          _id: "p-self",
          orderedBy: { kind: "member", refId: "ali", nameSnapshot: "Ali" },
          paidBy: { kind: "member", refId: "ali", nameSnapshot: "Ali" },
          amountPaisa: paisaFromRupees(500),
        },
      ],
    });
    expect(allocations).toEqual([]);
  });

  it("includes chargeable guest and parcels separately", () => {
    const allocations = buildAmericanAllocations({
      outingId: "o1",
      sharedBillPaisa: paisaFromRupees(10000),
      chargeableParticipants: [
        { kind: "member", refId: "a", nameSnapshot: "A" },
        { kind: "member", refId: "b", nameSnapshot: "B" },
        { kind: "member", refId: "c", nameSnapshot: "C" },
        { kind: "member", refId: "d", nameSnapshot: "D" },
        { kind: "guest", refId: "g1", nameSnapshot: "Guest" },
      ],
      parcels: [
        {
          _id: "p1",
          orderedBy: { kind: "member", refId: "a", nameSnapshot: "A" },
          amountPaisa: paisaFromRupees(1200),
        },
      ],
    });
    const ali = allocations.find(
      (a) => a.participantId === "a" && a.allocationType === "american_parcel",
    );
    expect(ali.amountPaisa).toBe(paisaFromRupees(1200));
    const sharedSum = allocations
      .filter((a) => a.allocationType === "american_shared")
      .reduce((s, a) => s + a.amountPaisa, 0);
    expect(sharedSum).toBe(paisaFromRupees(10000));
  });

  it("parcel example totals per person", () => {
    const allocations = buildAmericanAllocations({
      outingId: "o1",
      sharedBillPaisa: paisaFromRupees(8000),
      chargeableParticipants: ["a", "b", "c", "d"].map((id) => ({
        kind: "member",
        refId: id,
        nameSnapshot: id,
      })),
      parcels: [
        {
          _id: "p1",
          orderedBy: { kind: "member", refId: "a", nameSnapshot: "Ali" },
          amountPaisa: paisaFromRupees(1200),
        },
        {
          _id: "p2",
          orderedBy: { kind: "member", refId: "b", nameSnapshot: "Ahmed" },
          amountPaisa: paisaFromRupees(500),
        },
      ],
    });
    const share = (id) =>
      allocations
        .filter((a) => a.participantId === id)
        .reduce((s, a) => s + a.amountPaisa, 0);
    expect(share("a")).toBe(paisaFromRupees(3200));
    expect(share("b")).toBe(paisaFromRupees(2500));
    expect(share("c")).toBe(paisaFromRupees(2000));
    expect(share("d")).toBe(paisaFromRupees(2000));
  });
});

describe("balances and settlements", () => {
  it("combines multiple american outings", () => {
    const participants = [m("ali", "Ali"), m("ahmed", "Ahmed"), m("bilal", "Bilal"), m("usman", "Usman")];
    const share = paisaFromRupees(2000);
    const allocations = participants.flatMap((p) => [
      { participantKind: "member", participantId: p.id, participantNameSnapshot: p.name, amountPaisa: share },
      { participantKind: "member", participantId: p.id, participantNameSnapshot: p.name, amountPaisa: paisaFromRupees(1000) },
    ]);
    const transactions = [
      {
        type: TRANSACTION_TYPES.AMERICAN_CONTRIBUTION,
        amountPaisa: paisaFromRupees(8000),
        payerKind: "member",
        payerId: "ali",
        payerNameSnapshot: "Ali",
        affectsSettlement: true,
      },
      {
        type: TRANSACTION_TYPES.AMERICAN_CONTRIBUTION,
        amountPaisa: paisaFromRupees(4000),
        payerKind: "member",
        payerId: "ahmed",
        payerNameSnapshot: "Ahmed",
        affectsSettlement: true,
      },
    ];
    const map = computeBalances({ allocations, transactions, participants });
    const rows = balancesToArray(map);
    const ali = rows.find((r) => r.id === "ali");
    expect(ali.netBalancePaisa).toBe(paisaFromRupees(5000));
    const totalNet = rows.reduce((s, r) => s + r.netBalancePaisa, 0);
    expect(totalNet).toBe(0);
  });

  it("records transfers without double counting as expense", () => {
    const participants = [m("ali", "Ali"), m("ahmed", "Ahmed")];
    const allocations = [
      {
        participantKind: "member",
        participantId: "ali",
        participantNameSnapshot: "Ali",
        amountPaisa: paisaFromRupees(3000),
      },
      {
        participantKind: "member",
        participantId: "ahmed",
        participantNameSnapshot: "Ahmed",
        amountPaisa: paisaFromRupees(3000),
      },
    ];
    const transactions = [
      {
        type: TRANSACTION_TYPES.AMERICAN_CONTRIBUTION,
        amountPaisa: paisaFromRupees(6000),
        payerKind: "member",
        payerId: "ali",
        payerNameSnapshot: "Ali",
        affectsSettlement: true,
      },
      {
        type: TRANSACTION_TYPES.MEMBER_TRANSFER,
        amountPaisa: paisaFromRupees(1500),
        payerKind: "member",
        payerId: "ahmed",
        payerNameSnapshot: "Ahmed",
        recipientKind: "member",
        recipientId: "ali",
        recipientNameSnapshot: "Ali",
        affectsSettlement: true,
      },
    ];
    const map = computeBalances({ allocations, transactions, participants });
    expect(map[participantKey("member", "ahmed")].netBalancePaisa).toBe(
      -paisaFromRupees(4500),
    );
    expect(map[participantKey("member", "ali")].netBalancePaisa).toBe(
      paisaFromRupees(4500),
    );
  });

  it("generates balancing settlement recommendations", () => {
    const rows = [
      { kind: "member", id: "1", name: "Ali", netBalancePaisa: paisaFromRupees(3000) },
      { kind: "member", id: "2", name: "Ahmed", netBalancePaisa: -paisaFromRupees(2000) },
      { kind: "member", id: "3", name: "Bilal", netBalancePaisa: -paisaFromRupees(1000) },
    ];
    const recs = recommendTransfers(rows);
    const total = recs.reduce((s, r) => s + r.amountPaisa, 0);
    expect(total).toBe(paisaFromRupees(3000));
    expect(recs.every((r) => r.amountPaisa > 0)).toBe(true);
    expect(recs).toEqual([
      {
        fromKind: "member",
        fromId: "2",
        fromName: "Ahmed",
        toKind: "member",
        toId: "1",
        toName: "Ali",
        amountPaisa: paisaFromRupees(2000),
      },
      {
        fromKind: "member",
        fromId: "3",
        fromName: "Bilal",
        toKind: "member",
        toId: "1",
        toName: "Ali",
        amountPaisa: paisaFromRupees(1000),
      },
    ]);
  });

  it("american outing ledger nets to zero", () => {
    const participants = [
      m("ali", "Ali"),
      m("ahmed", "Ahmed"),
      m("bilal", "Bilal"),
    ];
    const allocations = buildAmericanAllocations({
      outingId: "o1",
      sharedBillPaisa: paisaFromRupees(6000),
      chargeableParticipants: participants.map((p) => ({
        kind: "member",
        refId: p.id,
        nameSnapshot: p.name,
      })),
      parcels: [],
    });
    const transactions = [
      {
        type: TRANSACTION_TYPES.AMERICAN_CONTRIBUTION,
        amountPaisa: paisaFromRupees(6000),
        payerKind: "member",
        payerId: "ali",
        payerNameSnapshot: "Ali",
        affectsSettlement: true,
      },
    ];
    const rows = balancesToArray(
      computeBalances({ allocations, transactions, participants }),
    );
    expect(sumNetBalances(rows)).toBe(0);
    expect(rows.find((r) => r.id === "ali").netBalancePaisa).toBe(
      paisaFromRupees(4000),
    );
  });

  it("kameti splits total bill minus parcels among members who pay share", () => {
    const allocations = buildKametiAllocations({
      outingId: "o-k-parcel",
      sharedBillPaisa: paisaFromRupees(10000),
      attendance: [
        {
          memberId: "host",
          memberNameSnapshot: "Host",
          status: "present",
          paysShare: true,
        },
        {
          memberId: "a",
          memberNameSnapshot: "A",
          status: "present",
          paysShare: true,
        },
      ],
      parcels: [
        {
          _id: "p1",
          orderedBy: { kind: "member", refId: "a", nameSnapshot: "A" },
          paidBy: { kind: "member", refId: "host", nameSnapshot: "Host" },
          amountPaisa: paisaFromRupees(2000),
        },
      ],
    });
    const shared = allocations.filter(
      (a) => a.allocationType === "kameti_shared",
    );
    expect(shared.reduce((s, a) => s + a.amountPaisa, 0)).toBe(
      paisaFromRupees(8000),
    );
  });

  it("kameti settlement splits shared bill among members who pay share", () => {
    const participants = [m("host", "Host"), m("a", "A"), m("b", "B")];
    const allocations = buildKametiAllocations({
      outingId: "o-k",
      sharedBillPaisa: paisaFromRupees(9000),
      attendance: [
        {
          memberId: "host",
          memberNameSnapshot: "Host",
          status: "present",
          paysShare: true,
        },
        {
          memberId: "a",
          memberNameSnapshot: "A",
          status: "present",
          paysShare: true,
        },
        {
          memberId: "b",
          memberNameSnapshot: "B",
          status: "absent",
          paysShare: true,
        },
      ],
      parcels: [],
    });
    const transactions = [
      {
        type: TRANSACTION_TYPES.RESTAURANT_BILL,
        amountPaisa: paisaFromRupees(9000),
        payerKind: "member",
        payerId: "host",
        payerNameSnapshot: "Host",
        affectsSettlement: true,
        outingId: "o-k",
      },
    ];
    const settlementContext = {
      outingPaymentById: new Map([["o-k", PAYMENT_SYSTEMS.KAMETI]]),
      outingRotationByOutingId: new Map([["o-k", "rot-1"]]),
      settlementsIncludedByRotationId: new Map([["rot-1", true]]),
      settlementsIncludedByOutingId: new Map([["o-k", true]]),
    };
    const transfers = computeSettlementTransfers({
      scope: SETTLEMENT_SCOPE.KAMETI,
      allocations,
      transactions,
      participants,
      settlementContext,
    });
    expect(transfers.length).toBeGreaterThan(0);
    expect(transfers.every((t) => t.toName === "Host")).toBe(true);
  });

  it("kameti excludes absent members when Pays share is unchecked", () => {
    const allocations = buildKametiAllocations({
      outingId: "o-k2",
      sharedBillPaisa: paisaFromRupees(9000),
      attendance: [
        {
          memberId: "host",
          memberNameSnapshot: "Host",
          status: "present",
          paysShare: true,
        },
        {
          memberId: "a",
          memberNameSnapshot: "A",
          status: "absent",
          paysShare: false,
        },
      ],
      parcels: [],
    });
    const shared = allocations.filter((a) => a.allocationType === "kameti_shared");
    expect(shared).toHaveLength(1);
    expect(String(shared[0].participantId)).toBe("host");
  });

  it("excludes a Kameti rotation marked settled from kameti and overall settlements", () => {
    const participants = [m("host", "Host"), m("a", "A"), m("b", "B")];
    const allocations = buildKametiAllocations({
      outingId: "o-k",
      sharedBillPaisa: paisaFromRupees(9000),
      attendance: [
        { memberId: "host", memberNameSnapshot: "Host", status: "present" },
        { memberId: "a", memberNameSnapshot: "A", status: "present" },
        { memberId: "b", memberNameSnapshot: "B", status: "present" },
      ],
      parcels: [],
    });
    const transactions = [
      {
        type: TRANSACTION_TYPES.RESTAURANT_BILL,
        amountPaisa: paisaFromRupees(9000),
        payerKind: "member",
        payerId: "host",
        payerNameSnapshot: "Host",
        affectsSettlement: true,
        outingId: "o-k",
      },
    ];
    const settlementContext = {
      outingPaymentById: new Map([["o-k", PAYMENT_SYSTEMS.KAMETI]]),
      outingRotationByOutingId: new Map([["o-k", "rot-1"]]),
      settlementsIncludedByRotationId: new Map([["rot-1", false]]),
      settlementsIncludedByOutingId: new Map([["o-k", true]]),
    };
    const kameti = computeSettlementTransfers({
      scope: SETTLEMENT_SCOPE.KAMETI,
      allocations,
      transactions,
      participants,
      settlementContext,
    });
    const overall = computeSettlementTransfers({
      scope: SETTLEMENT_SCOPE.OVERALL,
      allocations,
      transactions,
      participants,
      settlementContext,
    });
    expect(kameti).toEqual([]);
    expect(overall).toEqual([]);
  });

  it("scopes american and overall settlements separately", () => {
    const participants = [m("ali", "Ali"), m("ahmed", "Ahmed")];
    const settlementContext = {
      outingPaymentById: new Map([
        ["o-a", PAYMENT_SYSTEMS.AMERICAN],
        ["o-k", PAYMENT_SYSTEMS.KAMETI],
      ]),
      outingRotationByOutingId: new Map([["o-k", "rot-k"]]),
      settlementsIncludedByRotationId: new Map([["rot-k", true]]),
      settlementsIncludedByOutingId: new Map([
        ["o-a", true],
        ["o-k", true],
      ]),
    };
    const allocations = [
      ...buildAmericanAllocations({
        outingId: "o-a",
        sharedBillPaisa: paisaFromRupees(4000),
        chargeableParticipants: [
          { kind: "member", refId: "ali", nameSnapshot: "Ali" },
          { kind: "member", refId: "ahmed", nameSnapshot: "Ahmed" },
        ],
      }),
      ...buildKametiAllocations({
        outingId: "o-k",
        parcels: [
          {
            _id: "p1",
            orderedBy: { kind: "member", refId: "ahmed", nameSnapshot: "Ahmed" },
            amountPaisa: paisaFromRupees(500),
          },
        ],
      }),
    ];
    const transactions = [
      {
        type: TRANSACTION_TYPES.AMERICAN_CONTRIBUTION,
        amountPaisa: paisaFromRupees(4000),
        payerKind: "member",
        payerId: "ali",
        payerNameSnapshot: "Ali",
        affectsSettlement: true,
        outingId: "o-a",
      },
      {
        type: TRANSACTION_TYPES.RESTAURANT_BILL,
        amountPaisa: paisaFromRupees(500),
        payerKind: "member",
        payerId: "ali",
        payerNameSnapshot: "Ali",
        affectsSettlement: true,
        outingId: "o-k",
        notes: "Parcel payment",
      },
    ];
    const american = computeSettlementTransfers({
      scope: SETTLEMENT_SCOPE.AMERICAN,
      allocations,
      transactions,
      participants,
      settlementContext,
    });
    expect(american).toEqual([
      expect.objectContaining({
        fromName: "Ahmed",
        toName: "Ali",
        amountPaisa: paisaFromRupees(2500),
      }),
    ]);
    const kameti = computeSettlementTransfers({
      scope: SETTLEMENT_SCOPE.KAMETI,
      allocations,
      transactions,
      participants,
      settlementContext,
    });
    expect(kameti).toEqual([]);
    const americanParcelOnly = computeSettlementTransfers({
      scope: SETTLEMENT_SCOPE.AMERICAN,
      allocations: allocations.filter((a) => a.outingId === "o-k"),
      transactions: transactions.filter((t) => t.outingId === "o-k"),
      participants,
      settlementContext,
    });
    expect(americanParcelOnly).toEqual([
      expect.objectContaining({
        fromName: "Ahmed",
        toName: "Ali",
        amountPaisa: paisaFromRupees(500),
      }),
    ]);
  });

  it("kameti host-paid parcel appears in american but not double-counted in overall", () => {
    const participants = [m("host", "Host"), m("ahmed", "Ahmed")];
    const settlementContext = {
      outingPaymentById: new Map([["o-k", PAYMENT_SYSTEMS.KAMETI]]),
      outingRotationByOutingId: new Map([["o-k", "rot-k"]]),
      settlementsIncludedByRotationId: new Map([["rot-k", true]]),
      settlementsIncludedByOutingId: new Map([["o-k", true]]),
      outingHostByOutingId: new Map([["o-k", "host"]]),
    };
    const allocations = buildKametiAllocations({
      outingId: "o-k",
      sharedBillPaisa: paisaFromRupees(10000),
      attendance: [
        {
          memberId: "host",
          memberNameSnapshot: "Host",
          status: "present",
          paysShare: true,
        },
        {
          memberId: "ahmed",
          memberNameSnapshot: "Ahmed",
          status: "present",
          paysShare: true,
        },
      ],
      parcels: [
        {
          _id: "p1",
          orderedBy: { kind: "member", refId: "ahmed", nameSnapshot: "Ahmed" },
          paidBy: { kind: "member", refId: "host", nameSnapshot: "Host" },
          amountPaisa: paisaFromRupees(2000),
        },
      ],
    });
    const transactions = [
      {
        type: TRANSACTION_TYPES.RESTAURANT_BILL,
        amountPaisa: paisaFromRupees(10000),
        payerKind: "member",
        payerId: "host",
        payerNameSnapshot: "Host",
        affectsSettlement: true,
        outingId: "o-k",
        notes: "Shared bill",
      },
      {
        type: TRANSACTION_TYPES.RESTAURANT_BILL,
        amountPaisa: paisaFromRupees(2000),
        payerKind: "member",
        payerId: "host",
        payerNameSnapshot: "Host",
        affectsSettlement: true,
        outingId: "o-k",
        notes: "Parcel payment",
      },
    ];
    const american = computeSettlementTransfers({
      scope: SETTLEMENT_SCOPE.AMERICAN,
      allocations,
      transactions,
      participants,
      settlementContext,
    });
    expect(american).toEqual([
      expect.objectContaining({
        fromName: "Ahmed",
        toName: "Host",
        amountPaisa: paisaFromRupees(2000),
      }),
    ]);
    const overallRows = balancesToArray(
      computeBalances({
        allocations: filterAllocationsForScope(
          allocations,
          SETTLEMENT_SCOPE.OVERALL,
          settlementContext,
        ),
        transactions: filterTransactionsForScope(
          transactions,
          SETTLEMENT_SCOPE.OVERALL,
          settlementContext,
        ),
        participants,
      }),
    );
    expect(sumNetBalances(overallRows)).toBe(0);
  });
});

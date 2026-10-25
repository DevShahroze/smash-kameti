import Member from "@/models/Member";
import Outing from "@/models/Outing";
import KametiTurn from "@/models/KametiTurn";
import KametiRotation from "@/models/KametiRotation";
import Transaction from "@/models/Transaction";
import { TURN_STATUS, PAYMENT_SYSTEMS, OUTING_STATUS } from "@/lib/constants";
import { getSettlementBalances } from "@/lib/services/ledger";
import GroupSettings from "@/models/GroupSettings";

export async function getDashboardData() {
  const [
    members,
    activeRotation,
    recentOutings,
    recentTransactions,
    balances,
    settings,
  ] = await Promise.all([
    Member.find({ active: true }).lean(),
    KametiRotation.findOne({ active: true }).sort({ createdAt: -1 }).lean(),
    Outing.find()
      .sort({ updatedAt: -1 })
      .limit(8)
      .lean(),
    Transaction.find().sort({ transactionDate: -1 }).limit(8).lean(),
    getSettlementBalances(),
    GroupSettings.findOne().lean(),
  ]);

  let turns = [];
  let nextPending = null;
  if (activeRotation) {
    turns = await KametiTurn.find({ rotationId: activeRotation._id })
      .sort({ turnNumber: 1 })
      .lean();
    nextPending = turns.find((t) => t.status === TURN_STATUS.PENDING);
  }

  const completedTurns = turns.filter(
    (t) => t.status === TURN_STATUS.COMPLETED,
  ).length;
  const pendingTurns = turns.filter((t) => t.status === TURN_STATUS.PENDING);

  const memberBalances = balances.filter((b) => b.kind === "member");
  const unsettled = memberBalances.filter((b) => b.netBalancePaisa !== 0);

  const totalRestaurant = await Transaction.aggregate([
    {
      $match: {
        type: { $in: ["restaurant_bill", "american_contribution"] },
      },
    },
    { $group: { _id: null, total: { $sum: "$amountPaisa" } } },
  ]);

  const americanOutings = await Outing.countDocuments({
    paymentSystem: PAYMENT_SYSTEMS.AMERICAN,
    status: OUTING_STATUS.COMPLETED,
  });

  const upcoming = await Outing.find({
    $or: [
      { status: OUTING_STATUS.PLANNED },
      { status: OUTING_STATUS.POSTPONED },
    ],
  })
    .sort({ scheduledDate: 1 })
    .limit(5)
    .lean();

  const rotationLabel = activeRotation
    ? activeRotation.label ||
      `Kameti ${new Date(activeRotation.createdAt).toLocaleDateString()}`
    : null;

  return {
    groupName: settings?.groupName || "Smash Kameti",
    kameti: {
      rotationId: activeRotation?._id || null,
      rotationLabel,
      totalMembers: members.length,
      totalTurns: turns.length,
      turnsCompleted: completedTurns,
      turnsRemaining: pendingTurns.length,
      nextPending,
      pendingMembers: pendingTurns.map((t) => ({
        turnNumber: t.turnNumber,
        memberName: t.memberNameSnapshot,
        turnId: t._id,
      })),
      upcomingOutings: upcoming,
    },
    financial: {
      totalRestaurantPaisa: totalRestaurant[0]?.total || 0,
      americanOutingCount: americanOutings,
      unsettledCount: unsettled.length,
      totalToReceivePaisa: unsettled
        .filter((b) => b.netBalancePaisa > 0)
        .reduce((s, b) => s + b.netBalancePaisa, 0),
      totalToPayPaisa: unsettled
        .filter((b) => b.netBalancePaisa < 0)
        .reduce((s, b) => s + -b.netBalancePaisa, 0),
    },
    recentOutings,
    recentTransactions,
  };
}

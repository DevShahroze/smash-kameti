import Outing from "@/models/Outing";
import { OUTING_STATUS } from "@/lib/constants";

export async function getVenueWithStats(venueId) {
  const outings = await Outing.find({
    venueId,
    status: OUTING_STATUS.COMPLETED,
  }).lean();

  const bills = outings.map((o) => o.sharedBillPaisa).filter((n) => n > 0);
  const visitCount = outings.length;
  const total = bills.reduce((s, n) => s + n, 0);
  const avg = visitCount ? Math.round(total / visitCount) : 0;
  const highest = bills.length ? Math.max(...bills) : 0;
  const lowest = bills.length ? Math.min(...bills) : 0;

  return {
    visitCount,
    averageBillPaisa: avg,
    highestBillPaisa: highest,
    lowestBillPaisa: lowest,
    outings,
  };
}

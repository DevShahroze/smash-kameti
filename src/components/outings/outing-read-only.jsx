"use client";

import { memo } from "react";
import { format } from "date-fns";
import { Money } from "@/components/money";

export const OutingReadOnly = memo(function OutingReadOnly({ outing }) {
  if (!outing) {
    return null;
  }

  const date = outing.actualDate || outing.scheduledDate;

  return (
    <dl className="grid gap-3 text-sm sm:grid-cols-2">
      <div>
        <dt className="text-xs text-muted-foreground">Week</dt>
        <dd className="font-medium">{outing.weekNumber}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Date</dt>
        <dd>{date ? format(new Date(date), "dd MMM yyyy") : "—"}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Venue</dt>
        <dd>{outing.venueNameSnapshot || "—"}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Type</dt>
        <dd className="capitalize">{outing.paymentSystem}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Status</dt>
        <dd className="capitalize">
          {outing.status}
          {outing.settlementsIncluded === false ? " (inactive)" : ""}
        </dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Host</dt>
        <dd>{outing.hostMemberNameSnapshot || "—"}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Shared bill</dt>
        <dd><Money paisa={outing.sharedBillPaisa} /></dd>
      </div>
      <div>
        <dt className="text-xs text-muted-foreground">Parcels total</dt>
        <dd>
          <Money
            paisa={(outing.parcels || []).reduce(
              (s, p) => s + (p.amountPaisa || 0),
              0,
            )}
          />
        </dd>
      </div>
      {outing.notes ? (
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted-foreground">Notes</dt>
          <dd className="whitespace-pre-wrap">{outing.notes}</dd>
        </div>
      ) : null}
      {(outing.attendance || []).length > 0 ? (
        <div className="sm:col-span-2">
          <dt className="mb-1 text-xs text-muted-foreground">Attendance</dt>
          <dd>
            <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
              {outing.attendance.map((a) => (
                <li key={String(a.memberId)}>
                  {a.memberNameSnapshot}{" "}
                  <span className="text-muted-foreground">({a.status})</span>
                </li>
              ))}
            </ul>
          </dd>
        </div>
      ) : null}
    </dl>
  );
});

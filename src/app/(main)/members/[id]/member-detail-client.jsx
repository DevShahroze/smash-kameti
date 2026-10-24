"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Money } from "@/components/money";
import { Badge } from "@/components/ui/badge";
import { balanceStatus } from "@/lib/accounting/balances";
import { format } from "date-fns";

export default function MemberDetailClient({ id }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["member", id],
    queryFn: () => apiFetch(`/api/members/${id}`),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error.message}</p>;
  }

  const { member, balance, stats, turns, outings, history } = data;
  const net = balanceStatus(balance?.netBalancePaisa || 0);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">{member.fullName}</h1>
        <p className="text-sm text-muted-foreground">{member.nickname}</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Net balance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <Money
              paisa={balance?.netBalancePaisa || 0}
              className="text-xl font-semibold"
            />
            <p className="text-xs text-muted-foreground">
              {net.kind === "settled" && "Settled up"}
              {net.kind === "receive" && (
                <>
                  Should receive <Money paisa={net.amountPaisa} />
                </>
              )}
              {net.kind === "owe" && (
                <>
                  Owes <Money paisa={net.amountPaisa} />
                </>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Kameti turns</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-lg font-semibold">
              {stats.kametiCompleted} done · {stats.kametiPending} pending
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Restaurant paid</CardTitle>
          </CardHeader>
          <CardContent>
            <Money paisa={stats.totalPaidRestaurantPaisa} className="text-lg font-semibold" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Kameti turns</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {turns?.length ? (
            turns.map((t) => (
              <div key={t._id} className="flex items-center justify-between text-sm">
                <span>#{t.turnNumber}</span>
                <Badge variant="outline" className="capitalize">{t.status}</Badge>
                <Money paisa={t.treatAmountPaisa} />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No turns recorded</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Expenses (your share)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {history?.expenses?.length ? (
            history.expenses.map((row, i) => (
              <div key={i} className="flex justify-between gap-2 text-sm">
                <span className="min-w-0 truncate">
                  {row.label}
                  {row.outingLabel ? ` · ${row.outingLabel}` : ""}
                </span>
                <Money paisa={row.amountPaisa} />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No allocated expenses</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payments made</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {history?.payments?.length ? (
            history.payments.map((row, i) => (
              <div key={i} className="flex justify-between gap-2 text-sm">
                <span>
                  {row.label}
                  {row.date
                    ? ` · ${format(new Date(row.date), "dd MMM yyyy")}`
                    : ""}
                </span>
                <Money paisa={row.amountPaisa} />
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No payments recorded</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Transfers</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {history?.transfersIn?.length || history?.transfersOut?.length ? (
            <>
              {history.transfersIn?.map((t, i) => (
                <div key={`in-${i}`} className="flex justify-between">
                  <span>Received from {t.fromName}</span>
                  <Money paisa={t.amountPaisa} />
                </div>
              ))}
              {history.transfersOut?.map((t, i) => (
                <div key={`out-${i}`} className="flex justify-between">
                  <span>Paid to {t.toName}</span>
                  <Money paisa={-t.amountPaisa} />
                </div>
              ))}
            </>
          ) : (
            <p className="text-muted-foreground">No transfers</p>
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Outings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {outings?.length ? (
            outings.map((o) => (
              <div key={o._id} className="flex justify-between text-sm">
                <span>Week {o.weekNumber} · {o.venueNameSnapshot}</span>
                <span className="capitalize">{o.paymentSystem}</span>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No outings</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

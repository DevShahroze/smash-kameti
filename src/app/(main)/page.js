"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { apiFetch } from "@/lib/api/client";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { kametiBillPath } from "@/lib/kameti-display";
import { Money } from "@/components/money";
import { ArrowRight, CalendarDays, Users, Wallet } from "lucide-react";
import { AdminOnly } from "@/components/auth/admin-only";
import { useAuth } from "@/components/providers/auth-provider";

function paymentLabel(system) {
  return system === "kameti" ? "Kameti" : "American";
}

export default function DashboardPage() {
  const { isAdmin } = useAuth();
  const { data, isLoading, error } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => apiFetch("/api/dashboard"),
  });

  if (isLoading) {
    return <p className="text-sm text-muted-foreground">Loading…</p>;
  }
  if (error) {
    return <p className="text-sm text-destructive">{error.message}</p>;
  }

  const { groupName, kameti, financial, recentOutings } = data;
  const kametiProgress =
    kameti.totalTurns > 0
      ? Math.round((kameti.turnsCompleted / kameti.totalTurns) * 100)
      : 0;
  const settled =
    financial.unsettledCount === 0 &&
    financial.totalToReceivePaisa === 0 &&
    financial.totalToPayPaisa === 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-lg font-medium">{groupName}</h1>
          <p className="text-xs text-muted-foreground">Group overview</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AdminOnly>
            <Link href="/outings/new" className={cn(buttonVariants({ size: "sm" }))}>
              Add outing
            </Link>
          </AdminOnly>
          <Link
            href="/kameti"
            className={cn(buttonVariants({ size: "sm", variant: "outline" }))}
          >
            Kameti
          </Link>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <Card size="sm" className="sm:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Kameti</CardTitle>
            <CardDescription className="text-xs">
              {kameti.rotationLabel || "No active rotation"}
            </CardDescription>
            {kameti.rotationId && (
              <CardAction>
                <Link
                  href={`/kameti/${kameti.rotationId}`}
                  className={cn(
                    buttonVariants({ size: "xs", variant: "ghost" }),
                    "gap-1",
                  )}
                >
                  Open
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </CardAction>
            )}
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {kameti.rotationId ? (
              <>
                {kameti.nextPending ? (
                  <p>
                    <span className="text-muted-foreground">Up next: </span>
                    <span className="font-medium">
                      Week {kameti.nextPending.turnNumber} ·{" "}
                      {kameti.nextPending.memberNameSnapshot}
                    </span>
                  </p>
                ) : kameti.totalTurns > 0 ? (
                  <p className="text-muted-foreground">All turns complete.</p>
                ) : (
                  <p className="text-muted-foreground">No turns yet.</p>
                )}
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>
                      {kameti.turnsCompleted} / {kameti.totalTurns} treats
                    </span>
                    <span>{kametiProgress}%</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${kametiProgress}%` }}
                    />
                  </div>
                </div>
                {kameti.nextPending && (
                  isAdmin ? (
                    <Link
                      href={kametiBillPath(kameti.nextPending)}
                      className={cn(buttonVariants({ size: "sm" }), "w-full")}
                    >
                      {kameti.nextPending.outingId
                        ? "Edit current turn bill"
                        : "Add bill for current turn"}
                    </Link>
                  ) : kameti.nextPending.outingId ? (
                    <Link
                      href={`/outings/${kameti.nextPending.outingId}`}
                      className={cn(
                        buttonVariants({ size: "sm", variant: "outline" }),
                        "w-full",
                      )}
                    >
                      View current turn bill
                    </Link>
                  ) : null
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                Save a rotation on the Kameti page to start tracking turns.
              </p>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Wallet className="h-4 w-4 text-muted-foreground" />
              Settlements
            </CardTitle>
            <CardAction>
              <Link
                href="/settlements"
                className={cn(
                  buttonVariants({ size: "xs", variant: "ghost" }),
                  "gap-1",
                )}
              >
                View
                <ArrowRight className="h-3 w-3" />
              </Link>
            </CardAction>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-[10px] text-muted-foreground">
              American & parcels anytime — not tied to Kameti finishing.
            </p>
            {settled ? (
              <p className="font-medium text-emerald-600 dark:text-emerald-500">
                All settled up
              </p>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {financial.unsettledCount} member
                  {financial.unsettledCount === 1 ? "" : "s"} with open balances
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-md border px-2 py-1.5">
                    <p className="text-muted-foreground">To receive</p>
                    <p className="font-medium tabular-nums">
                      <Money paisa={financial.totalToReceivePaisa} />
                    </p>
                  </div>
                  <div className="rounded-md border px-2 py-1.5">
                    <p className="text-muted-foreground">To pay</p>
                    <p className="font-medium tabular-nums">
                      <Money paisa={financial.totalToPayPaisa} />
                    </p>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-1.5 text-sm">
              <Users className="h-4 w-4 text-muted-foreground" />
              Group
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p>
              <span className="font-medium tabular-nums">
                {kameti.totalMembers}
              </span>
              <span className="text-muted-foreground"> active members</span>
            </p>
            <p className="text-xs text-muted-foreground">
              {financial.americanOutingCount} American outing
              {financial.americanOutingCount === 1 ? "" : "s"} recorded
            </p>
            <Link
              href="/members"
              className={cn(
                buttonVariants({ size: "xs", variant: "outline" }),
                "mt-2",
              )}
            >
              Manage members
            </Link>
          </CardContent>
        </Card>
      </div>

      <section className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <h2 className="flex items-center gap-1.5 text-sm font-medium">
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
            Recent outings
          </h2>
          <Link
            href="/outings"
            className={cn(buttonVariants({ size: "xs", variant: "ghost" }), "gap-1")}
          >
            All outings
            <ArrowRight className="h-3 w-3" />
          </Link>
        </div>
        {recentOutings?.length ? (
          <ul className="divide-y rounded-lg border bg-card text-sm ring-1 ring-foreground/10">
            {recentOutings.slice(0, 6).map((o) => (
              <li key={o._id}>
                <Link
                  href={`/outings/${o._id}`}
                  className="flex items-center justify-between gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      Week {o.weekNumber}
                      {o.venueNameSnapshot ? ` · ${o.venueNameSnapshot}` : ""}
                    </p>
                    <p className="text-xs text-muted-foreground capitalize">
                      {paymentLabel(o.paymentSystem)} · {o.status}
                      {(o.actualDate || o.scheduledDate) && (
                        <>
                          {" · "}
                          {format(
                            new Date(o.actualDate || o.scheduledDate),
                            "dd MMM yyyy",
                          )}
                        </>
                      )}
                    </p>
                  </div>
                  <span className="shrink-0 font-medium tabular-nums">
                    <Money paisa={o.sharedBillPaisa} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Card size="sm">
            <CardContent className="py-6 text-center text-sm text-muted-foreground">
              No outings yet.{" "}
              <Link href="/outings/new" className="text-foreground underline">
                Add the first one
              </Link>
              .
            </CardContent>
          </Card>
        )}
      </section>
    </div>
  );
}

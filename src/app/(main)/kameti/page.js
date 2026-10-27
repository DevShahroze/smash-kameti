"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-config";
import { buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { rotationTitle } from "@/lib/kameti-display";
import { cn } from "@/lib/utils";
import { SettlementsSummary } from "@/components/settlements/settlements-summary";
import { AdminOnly } from "@/components/auth/admin-only";
import { useAuth } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import {
  AppPanel,
  appTableCellClass,
  appTableHeadClass,
  appTableHeadRowClass,
} from "@/components/layout/app-panel";
import { Badge } from "@/components/ui/badge";

export default function KametiListPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const { data: rotations = [], isLoading } = useQuery({
    queryKey: queryKeys.kametiRotations,
    queryFn: () => apiFetch("/api/kameti/rotations"),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Kameti"
        description={
          isLoading
            ? "Loading rotations…"
            : `${rotations.length} rotation${rotations.length === 1 ? "" : "s"} · turns and treat bills`
        }
      >
        <AdminOnly>
          <Link href="/kameti/new" className={cn(buttonVariants({ size: "sm" }))}>
            New Kameti
          </Link>
        </AdminOnly>
      </PageHeader>

      <SettlementsSummary compact className="home-stat-card" />

      <AppPanel>
        {isLoading ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Loading…
          </p>
        ) : rotations.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm">
            <p className="text-muted-foreground">No Kameti saved yet.</p>
            {isAdmin ? (
              <Link
                href="/kameti/new"
                className={cn(buttonVariants({ size: "sm" }), "mt-3 inline-flex")}
              >
                Add your first Kameti
              </Link>
            ) : null}
          </div>
        ) : (
          <Table className="text-sm">
            <TableHeader>
              <TableRow className={appTableHeadRowClass}>
                <TableHead className={appTableHeadClass}>Name</TableHead>
                <TableHead className={appTableHeadClass}>Started</TableHead>
                <TableHead className={cn(appTableHeadClass, "text-right")}>
                  Members
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rotations.map((r) => {
                const href = `/kameti/${r._id}`;
                return (
                  <TableRow
                    key={r._id}
                    className="cursor-pointer hover:bg-muted/50"
                    tabIndex={0}
                    role="link"
                    aria-label={`Open ${rotationTitle(r)}`}
                    onClick={() => router.push(href)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        router.push(href);
                      }
                    }}
                  >
                    <TableCell className={cn(appTableCellClass, "font-medium")}>
                      {rotationTitle(r)}
                      <div className="mt-1 flex flex-wrap gap-1">
                        {r.active ? (
                          <Badge variant="secondary" className="font-normal">
                            Current
                          </Badge>
                        ) : null}
                        {r.settlementsIncluded === false ? (
                          <Badge
                            variant="outline"
                            className="font-normal text-amber-700 dark:text-amber-500"
                          >
                            Settled
                          </Badge>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell
                      className={cn(appTableCellClass, "text-muted-foreground")}
                    >
                      {new Date(r.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell
                      className={cn(appTableCellClass, "text-right tabular-nums")}
                    >
                      {r.memberIds?.length ?? "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </AppPanel>
    </div>
  );
}

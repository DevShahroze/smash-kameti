"use client";

import Link from "next/link";
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

export default function KametiListPage() {
  const { isAdmin } = useAuth();
  const { data: rotations = [], isLoading } = useQuery({
    queryKey: queryKeys.kametiRotations,
    queryFn: () => apiFetch("/api/kameti/rotations"),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="text-lg font-medium">Kameti</h1>
          <p className="text-xs text-muted-foreground">
            Open a rotation for turns and bills. Settlements stay live while
            Kameti is in progress.
          </p>
        </div>
        <AdminOnly>
          <Link href="/kameti/new" className={cn(buttonVariants({ size: "sm" }))}>
            New Kameti
          </Link>
        </AdminOnly>
      </div>

      <SettlementsSummary compact />

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading…</p>
      ) : rotations.length === 0 ? (
        <div className="rounded-lg border p-6 text-center text-sm">
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
        <Table className="text-sm [&_td]:py-2 [&_th]:h-9">
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Started</TableHead>
              <TableHead className="text-right">Members</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rotations.map((r) => (
              <TableRow key={r._id} className="cursor-pointer hover:bg-muted/50">
                <TableCell className="p-0 font-medium">
                  <Link
                    href={`/kameti/${r._id}`}
                    className="block px-2 py-2"
                  >
                    {rotationTitle(r)}
                    {r.active ? (
                      <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-muted-foreground">
                        current
                      </span>
                    ) : null}
                    {r.settlementsIncluded === false ? (
                      <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-amber-600 dark:text-amber-500">
                        settled
                      </span>
                    ) : null}
                  </Link>
                </TableCell>
                <TableCell className="p-0 text-muted-foreground">
                  <Link href={`/kameti/${r._id}`} className="block px-2 py-2">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </Link>
                </TableCell>
                <TableCell className="p-0 text-right tabular-nums">
                  <Link href={`/kameti/${r._id}`} className="block px-2 py-2">
                    {r.memberIds?.length ?? "—"}
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

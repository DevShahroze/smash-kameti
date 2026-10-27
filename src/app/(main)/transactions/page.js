"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { queryKeys } from "@/lib/api/query-config";
import { transactionPurpose } from "@/lib/transaction-display";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OptionSelect } from "@/components/ui/option-select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Money } from "@/components/money";
import { paisaFromRupees } from "@/lib/money";
import { transactionTypeLabel } from "@/lib/constants";
import { format } from "date-fns";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Trash2 } from "lucide-react";
import { AdminOnly } from "@/components/auth/admin-only";
import { useAuth } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/layout/page-header";
import {
  AppPanel,
  appTableCellClass,
  appTableHeadClass,
  appTableHeadRowClass,
} from "@/components/layout/app-panel";
import { cn } from "@/lib/utils";

const TRANSACTIONS_PAGE_SIZE = 25;

function TransactionHistoryPagination({
  page,
  pageCount,
  total,
  pageSize,
  onPageChange,
  disabled,
}) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2.5 text-xs text-muted-foreground"
    >
      <p>
        {total === 0
          ? "No transactions"
          : `Showing ${start}–${end} of ${total}`}
      </p>
      <div className="flex items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <span className="min-w-[7rem] text-center tabular-nums text-foreground">
          Page {page} of {pageCount}
        </span>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data: members = [] } = useQuery({
    queryKey: queryKeys.members,
    queryFn: () => apiFetch("/api/members"),
  });
  const [historyPage, setHistoryPage] = useState(1);
  const { data: historyData, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.transactionsHistory(
      historyPage,
      TRANSACTIONS_PAGE_SIZE,
    ),
    queryFn: () =>
      apiFetch(
        `/api/transactions?page=${historyPage}&pageSize=${TRANSACTIONS_PAGE_SIZE}`,
      ),
  });
  const transactions = historyData?.items ?? [];
  const historyTotal = historyData?.total ?? 0;
  const historyPageCount = historyData?.pageCount ?? 1;

  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [adjMemberId, setAdjMemberId] = useState("");
  const [adjAmount, setAdjAmount] = useState("");
  const [adjNotes, setAdjNotes] = useState("");

  const transferMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/transfers", {
        method: "POST",
        body: JSON.stringify({
          fromMemberId: fromId,
          toMemberId: toId,
          amountPaisa: paisaFromRupees(amount),
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      setHistoryPage(1);
      toast.success("Transfer saved");
      setAmount("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) =>
      apiFetch(`/api/transactions/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      if (transactions.length === 1 && historyPage > 1) {
        setHistoryPage(historyPage - 1);
      }
      toast.success("Transaction deleted");
    },
    onError: (e) => toast.error(e.message),
  });

  const adjMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/adjustments", {
        method: "POST",
        body: JSON.stringify({
          memberId: adjMemberId,
          amountPaisa: paisaFromRupees(adjAmount),
          type: "adjustment",
          notes: adjNotes,
        }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      setHistoryPage(1);
      toast.success("Adjustment saved");
    },
    onError: (e) => toast.error(e.message),
  });

  const activeMembers = members.filter((m) => m.active);
  const memberOptions = activeMembers.map((m) => ({
    value: m._id,
    label: m.nickname || m.fullName,
  }));

  return (
    <div className="space-y-5">
      <PageHeader
        title="Transactions"
        description={
          isLoading
            ? "Loading history…"
            : `${historyTotal} ledger row${historyTotal === 1 ? "" : "s"}`
        }
      />
      <Tabs defaultValue="history">
        <TabsList>
          <TabsTrigger value="history">History</TabsTrigger>
          <AdminOnly>
            <TabsTrigger value="transfer">Record transfer</TabsTrigger>
            <TabsTrigger value="adjustment">Adjustment</TabsTrigger>
          </AdminOnly>
        </TabsList>
        <AdminOnly>
        <TabsContent value="transfer" className="space-y-4 pt-4">
          <p className="max-w-2xl text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Record transfer — </span>
            When one member pays another outside a restaurant bill (cash, bank,
            EasyPaisa, etc.). This lowers what the payer owes and what the
            receiver is owed in <Link href="/settlements" className="underline">Settlements</Link>.
            Use this for payments you record yourself; marking{" "}
            <strong className="font-medium">Settled</strong> on Settlements also
            creates a transfer automatically.
          </p>
          <AppPanel className="max-w-md space-y-3 p-4">
          <div className="grid gap-3">
          <div className="space-y-2">
            <Label>From</Label>
            <OptionSelect
              value={fromId}
              onValueChange={setFromId}
              options={memberOptions}
              placeholder="Sender"
            />
          </div>
          <div className="space-y-2">
            <Label>To</Label>
            <OptionSelect
              value={toId}
              onValueChange={setToId}
              options={memberOptions}
              placeholder="Receiver"
            />
          </div>
          <div className="space-y-2">
            <Label>Amount (PKR)</Label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <Button
            onClick={() => transferMutation.mutate()}
            disabled={!fromId || !toId || !amount}
          >
            Save transfer
          </Button>
          </div>
          </AppPanel>
        </TabsContent>
        <TabsContent value="adjustment" className="space-y-4 pt-4">
          <p className="max-w-2xl text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Adjustment — </span>
            Fix one member&apos;s balance when something does not fit a normal
            bill or transfer (rounding, old debt, correction). Amount in PKR:{" "}
            <strong className="font-medium">positive</strong> = they should
            receive more; <strong className="font-medium">negative</strong> = they
            owe more. Notes are required so History shows why.
          </p>
          <AppPanel className="max-w-md space-y-3 p-4">
          <div className="grid gap-3">
          <div className="space-y-2">
            <Label>Member</Label>
            <OptionSelect
              value={adjMemberId}
              onValueChange={setAdjMemberId}
              options={memberOptions}
              placeholder="Member"
            />
          </div>
          <div className="space-y-2">
            <Label>Amount (PKR, + receive / − owe)</Label>
            <Input type="number" value={adjAmount} onChange={(e) => setAdjAmount(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Input value={adjNotes} onChange={(e) => setAdjNotes(e.target.value)} />
          </div>
          <Button
            onClick={() => adjMutation.mutate()}
            disabled={!adjMemberId || !adjAmount || !adjNotes}
          >
            Save adjustment
          </Button>
          </div>
          </AppPanel>
        </TabsContent>
        </AdminOnly>
        <TabsContent value="history" className="space-y-4 pt-4">
          <p className="max-w-2xl text-sm text-muted-foreground">
            <span className="font-medium text-foreground">History — </span>
            Everything that affects group money: outing bills and parcels (from{" "}
            <Link href="/outings" className="underline">Outings</Link>), member
            transfers, adjustments, and payments marked settled on Settlements.
            Purpose shows the outing or reason. Manual rows can be deleted here;
            outing-linked rows are changed by editing or deleting the outing.
          </p>
          <AppPanel>
            {isLoading ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                Loading…
              </p>
            ) : historyTotal === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                No transactions yet.
              </p>
            ) : (
            <>
            <Table>
              <TableHeader>
                <TableRow className={appTableHeadRowClass}>
                  <TableHead className={appTableHeadClass}>Date</TableHead>
                  <TableHead className={cn(appTableHeadClass, "min-w-[220px]")}>
                    Purpose
                  </TableHead>
                  <TableHead className={appTableHeadClass}>From</TableHead>
                  <TableHead className={appTableHeadClass}>To</TableHead>
                  <TableHead className={cn(appTableHeadClass, "text-right")}>
                    Amount
                  </TableHead>
                  {isAdmin ? (
                    <TableHead className={cn(appTableHeadClass, "w-12")} />
                  ) : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t._id}>
                    <TableCell
                      className={cn(
                        appTableCellClass,
                        "align-top whitespace-nowrap text-muted-foreground",
                      )}
                    >
                      {t.transactionDate
                        ? format(new Date(t.transactionDate), "dd MMM yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className={cn(appTableCellClass, "align-top")}>
                      <p className="leading-snug">{transactionPurpose(t)}</p>
                      {t.outingId ? (
                        <Link
                          href={`/outings/${t.outingId}`}
                          className="mt-1 inline-block text-xs text-muted-foreground underline hover:text-foreground"
                        >
                          Outing week {t.outing?.weekNumber ?? "—"}
                        </Link>
                      ) : null}
                    </TableCell>
                    <TableCell className={cn(appTableCellClass, "align-top")}>
                      {t.payerNameSnapshot}
                    </TableCell>
                    <TableCell className={cn(appTableCellClass, "align-top")}>
                      {t.recipientNameSnapshot || "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        appTableCellClass,
                        "align-top text-right font-medium tabular-nums",
                      )}
                    >
                      <Money paisa={t.amountPaisa} />
                    </TableCell>
                    {isAdmin ? (
                    <TableCell className={cn(appTableCellClass, "text-right")}>
                      {t.source === "manual" ? (
                        <AlertDialog>
                          <AlertDialogTrigger
                            render={
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                                aria-label="Delete transaction"
                                disabled={deleteMutation.isPending}
                              />
                            }
                          >
                            <Trash2 />
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                Delete this transaction?
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t.payerNameSnapshot}
                                {t.recipientNameSnapshot
                                  ? ` → ${t.recipientNameSnapshot}`
                                  : ""}{" "}
                                · {transactionTypeLabel(t.type)}. Settlements
                                will update after
                                delete.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                variant="destructive"
                                onClick={() => deleteMutation.mutate(t._id)}
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : null}
                    </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TransactionHistoryPagination
              page={historyPage}
              pageCount={historyPageCount}
              total={historyTotal}
              pageSize={TRANSACTIONS_PAGE_SIZE}
              disabled={isFetching}
              onPageChange={setHistoryPage}
            />
            </>
            )}
          </AppPanel>
        </TabsContent>
      </Tabs>
    </div>
  );
}

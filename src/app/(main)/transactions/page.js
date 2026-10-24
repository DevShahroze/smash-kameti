"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
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

export default function TransactionsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data: members = [] } = useQuery({
    queryKey: ["members"],
    queryFn: () => apiFetch("/api/members"),
  });
  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["transactions"],
    queryFn: () => apiFetch("/api/transactions"),
  });

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
    <div className="space-y-4">
      <h1 className="text-xl font-medium">Transactions</h1>
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
          <div className="grid max-w-md gap-3">
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
          <div className="grid max-w-md gap-3">
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
          {isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead className="min-w-[220px]">Purpose</TableHead>
                  <TableHead>From</TableHead>
                  <TableHead>To</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  {isAdmin ? <TableHead className="w-12" /> : null}
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t._id}>
                    <TableCell className="align-top whitespace-nowrap">
                      {t.transactionDate
                        ? format(new Date(t.transactionDate), "dd MMM yyyy")
                        : "—"}
                    </TableCell>
                    <TableCell className="align-top">
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
                    <TableCell className="align-top">
                      {t.payerNameSnapshot}
                    </TableCell>
                    <TableCell className="align-top">
                      {t.recipientNameSnapshot || "—"}
                    </TableCell>
                    <TableCell className="align-top text-right tabular-nums">
                      <Money paisa={t.amountPaisa} />
                    </TableCell>
                    {isAdmin ? (
                    <TableCell className="text-right">
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
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

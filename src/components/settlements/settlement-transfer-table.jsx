"use client";

import { memo, useMemo, useState } from "react";
import { Money } from "@/components/money";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const TransferRow = memo(function TransferRow({
  row,
  idx,
  scope,
  showSettledCheckbox,
  settlePending,
  onRequestSettle,
}) {
  return (
    <TableRow key={`${row.fromId}-${row.toId}-${row.amountPaisa}-${idx}`}>
      <TableCell className="font-medium">{row.fromName}</TableCell>
      <TableCell className="font-medium">{row.toName}</TableCell>
      <TableCell className="text-right tabular-nums">
        <Money paisa={row.amountPaisa} />
      </TableCell>
      {showSettledCheckbox ? (
        <TableCell className="text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Checkbox
              id={`settled-${scope}-${idx}`}
              checked={false}
              disabled={settlePending}
              onCheckedChange={(checked) => {
                if (checked === true) {
                  onRequestSettle(row);
                }
              }}
            />
            <Label htmlFor={`settled-${scope}-${idx}`} className="sr-only">
              Settled
            </Label>
          </div>
        </TableCell>
      ) : null}
    </TableRow>
  );
});

export const SettlementTransferTable = memo(function SettlementTransferTable({
  title,
  description,
  scope,
  transfers = [],
  showSettledCheckbox = false,
  onSettledChange,
  settlePending = false,
}) {
  const [confirmRow, setConfirmRow] = useState(null);

  const visibleTransfers = useMemo(
    () =>
      showSettledCheckbox ? transfers.filter((r) => !r.settled) : transfers,
    [showSettledCheckbox, transfers],
  );

  function confirmSettled() {
    if (!confirmRow || !onSettledChange || !scope) {
      setConfirmRow(null);
      return;
    }
    onSettledChange({
      scope,
      fromMemberId: confirmRow.fromId,
      toMemberId: confirmRow.toId,
      amountPaisa: confirmRow.amountPaisa,
      settled: true,
    });
    setConfirmRow(null);
  }

  return (
    <section className="space-y-2 rounded-lg border p-4">
      <div>
        <h2 className="font-medium">{title}</h2>
        {description ? (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {visibleTransfers.length === 0 ? (
        <p className="text-sm text-muted-foreground">Everyone is settled.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person who pays</TableHead>
              <TableHead>Person who receives</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              {showSettledCheckbox ? (
                <TableHead className="w-24 text-center">Settled</TableHead>
              ) : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleTransfers.map((row, idx) => (
              <TransferRow
                key={`${row.fromId}-${row.toId}-${row.amountPaisa}-${idx}`}
                row={row}
                idx={idx}
                scope={scope}
                showSettledCheckbox={showSettledCheckbox}
                settlePending={settlePending}
                onRequestSettle={setConfirmRow}
              />
            ))}
          </TableBody>
        </Table>
      )}

      <AlertDialog
        open={Boolean(confirmRow)}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmRow(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mark this payment as settled?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmRow ? (
                <>
                  <span className="font-medium text-foreground">
                    {confirmRow.fromName}
                  </span>{" "}
                  paid{" "}
                  <span className="font-medium text-foreground">
                    {confirmRow.toName}
                  </span>{" "}
                  <Money paisa={confirmRow.amountPaisa} />. This records a
                  member transfer and removes the row from this list.
                </>
              ) : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={settlePending}>Cancel</AlertDialogCancel>
            <AlertDialogAction disabled={settlePending} onClick={confirmSettled}>
              {settlePending ? "Saving…" : "Confirm settled"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
});

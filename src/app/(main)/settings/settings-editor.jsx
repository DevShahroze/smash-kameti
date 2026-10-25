"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ACCOUNTING_MODE_LABELS } from "@/lib/select-display";

const accountingModeOptions = [
  {
    value: "expense_based",
    label: ACCOUNTING_MODE_LABELS.expense_based,
  },
  {
    value: "combined",
    label: ACCOUNTING_MODE_LABELS.combined,
  },
];

export function SettingsEditor({ settings }) {
  const queryClient = useQueryClient();
  const [groupName, setGroupName] = useState(settings.groupName || "");
  const [accountingMode, setAccountingMode] = useState(
    settings.accountingMode || "expense_based",
  );

  const saveMutation = useMutation({
    mutationFn: () =>
      apiFetch("/api/settings", {
        method: "PATCH",
        body: JSON.stringify({ groupName, accountingMode }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      toast.success("Settings saved");
    },
    onError: (e) => toast.error(e.message),
  });

  return (
    <>
      <div className="space-y-2">
        <Label>Group name</Label>
        <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label>Accounting mode</Label>
        <OptionSelect
          value={accountingMode}
          onValueChange={setAccountingMode}
          options={accountingModeOptions}
        />
        <p className="text-xs text-muted-foreground">
          Expense-based is the default conservative mode: Kameti treats are
          historical unless you enable combined settlement and re-save
          completed Kameti outings.
        </p>
      </div>
      <Button onClick={() => saveMutation.mutate()}>Save</Button>
    </>
  );
}

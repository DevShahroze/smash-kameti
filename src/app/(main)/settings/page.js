"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { OptionSelect } from "@/components/ui/option-select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { ACCOUNTING_MODE_LABELS } from "@/lib/select-display";
import { GuestManager } from "./guest-manager";
import { useAuth } from "@/components/providers/auth-provider";

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

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch("/api/settings"),
  });
  const [groupName, setGroupName] = useState("");
  const [accountingMode, setAccountingMode] = useState("expense_based");

  useEffect(() => {
    if (settings) {
      setGroupName(settings.groupName || "");
      setAccountingMode(settings.accountingMode || "expense_based");
    }
  }, [settings]);

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
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Group & accounting</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {isAdmin ? (
            <>
              <div className="space-y-2">
                <Label>Group name</Label>
                <Input
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Accounting mode</Label>
                <OptionSelect
                  value={accountingMode}
                  onValueChange={setAccountingMode}
                  options={accountingModeOptions}
                />
                <p className="text-xs text-muted-foreground">
                  Expense-based is the default conservative mode: Kameti treats
                  are historical unless you enable combined settlement and
                  re-save completed Kameti outings.
                </p>
              </div>
              <Button onClick={() => saveMutation.mutate()}>Save</Button>
            </>
          ) : (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Group name</p>
                <p className="text-sm font-medium">{groupName || "—"}</p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Accounting mode</p>
                <p className="text-sm font-medium">
                  {ACCOUNTING_MODE_LABELS[accountingMode] || accountingMode}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>
      <GuestManager />
    </div>
  );
}

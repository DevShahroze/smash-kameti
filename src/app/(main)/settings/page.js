"use client";

import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ACCOUNTING_MODE_LABELS } from "@/lib/select-display";
import { GuestManager } from "./guest-manager";
import { SettingsEditor } from "./settings-editor";
import { useAuth } from "@/components/providers/auth-provider";
import { PageHeader } from "@/components/layout/page-header";

export default function SettingsPage() {
  const { isAdmin } = useAuth();
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: () => apiFetch("/api/settings"),
  });

  return (
    <div className="space-y-5">
      <PageHeader
        title="Settings"
        description="Group name, accounting mode, and guests."
      />
      <Card className="home-stat-card max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Group & accounting</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          {isAdmin && settings ? (
            <SettingsEditor key={String(settings._id)} settings={settings} />
          ) : settings ? (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Group name</p>
                <p className="text-sm font-medium">
                  {settings.groupName || "—"}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Accounting mode</p>
                <p className="text-sm font-medium">
                  {ACCOUNTING_MODE_LABELS[settings.accountingMode] ||
                    settings.accountingMode}
                </p>
              </div>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Loading…</p>
          )}
        </CardContent>
      </Card>
      <GuestManager />
    </div>
  );
}

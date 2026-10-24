"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const exports = [
  { type: "outings", label: "Outings" },
  { type: "transactions", label: "Transactions" },
  { type: "allocations", label: "Expense allocations" },
  { type: "settlements", label: "Settlements" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Reports</h1>
      <p className="text-sm text-muted-foreground">
        Export CSV snapshots for auditing. Use outings list filters in the app for interactive history.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {exports.map((item) => (
          <Card key={item.type}>
            <CardHeader>
              <CardTitle className="text-base">{item.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <a
                href={`/api/reports/export?type=${item.type}`}
                download
                className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
              >
                Download CSV
              </a>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

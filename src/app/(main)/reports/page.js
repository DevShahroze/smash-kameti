"use client";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";

const exports = [
  { type: "outings", label: "Outings" },
  { type: "transactions", label: "Transactions" },
  { type: "allocations", label: "Expense allocations" },
  { type: "settlements", label: "Settlements" },
];

export default function ReportsPage() {
  return (
    <div className="space-y-5">
      <PageHeader
        title="Reports"
        description="CSV exports for auditing — outings list in the app for day-to-day history."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {exports.map((item) => (
          <Card key={item.type} className="home-stat-card">
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

"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import {
  downloadActivityLogs,
  getActivityLogSnapshot,
  subscribeActivityLogs,
} from "@/lib/logging/activity-logger";

export function ActivityLogExportButton({ className }) {
  const count = useSyncExternalStore(
    subscribeActivityLogs,
    getActivityLogSnapshot,
    getActivityLogSnapshot,
  );

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className={className}
      onClick={() => downloadActivityLogs()}
    >
      Export logs ({count})
    </Button>
  );
}

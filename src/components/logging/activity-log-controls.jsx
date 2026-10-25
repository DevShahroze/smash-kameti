"use client";

import { useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  downloadActivityLogs,
  getActivityLogOptIn,
  getActivityLogSnapshot,
  setActivityLogOptIn,
  subscribeActivityLogs,
} from "@/lib/logging/activity-logger";

export function ActivityLogControls({ className }) {
  const optIn = useSyncExternalStore(
    subscribeActivityLogs,
    getActivityLogOptIn,
    () => true,
  );
  const count = useSyncExternalStore(
    subscribeActivityLogs,
    getActivityLogSnapshot,
    () => 0,
  );

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1.5">
        <Checkbox
          id="activity-log-opt-in"
          checked={optIn}
          onCheckedChange={(checked) => setActivityLogOptIn(checked === true)}
        />
        <Label
          htmlFor="activity-log-opt-in"
          className="cursor-pointer text-xs font-normal text-muted-foreground"
        >
          Record logs
        </Label>
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className={className}
        disabled={!optIn || count === 0}
        onClick={() => downloadActivityLogs()}
      >
        Export ({count})
      </Button>
    </div>
  );
}

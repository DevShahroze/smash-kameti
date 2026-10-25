"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function ConnectionStatus() {
  const [online, setOnline] = useState(() =>
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[11px] font-medium",
        online
          ? "border-emerald-500/35 text-emerald-700 dark:text-emerald-400"
          : "border-amber-500/45 text-amber-800 dark:text-amber-400",
      )}
      title={
        online
          ? "Connected to the internet"
          : "No internet connection detected"
      }
      aria-live="polite"
    >
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          online ? "bg-emerald-500" : "bg-amber-500",
        )}
        aria-hidden
      />
      <span className="hidden sm:inline">{online ? "Online" : "Offline"}</span>
      <span className="sr-only sm:hidden">
        {online ? "Online" : "Offline"}
      </span>
    </span>
  );
}

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { logPageView } from "@/lib/logging/activity-logger";

export function ActivityNavigationLogger() {
  const pathname = usePathname();
  const initial = useRef(true);

  useEffect(() => {
    if (initial.current) {
      initial.current = false;
    }
    logPageView(pathname);
  }, [pathname]);

  return null;
}

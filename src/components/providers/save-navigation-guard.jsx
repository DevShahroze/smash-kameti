"use client";

import { useEffect } from "react";
import { isSaveInFlight } from "@/lib/api/save-in-flight";

export function SaveNavigationGuard() {
  useEffect(() => {
    const onBeforeUnload = (event) => {
      if (!isSaveInFlight()) {
        return;
      }
      event.preventDefault();
      event.returnValue =
        "A save is still in progress. Leave this page anyway?";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  return null;
}

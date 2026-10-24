"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";

const TOP_LEVEL_ROUTES = new Set([
  "/",
  "/outings",
  "/kameti",
  "/members",
  "/venues",
  "/settlements",
  "/transactions",
  "/reports",
  "/settings",
]);

/** Browser history back — only on nested pages (edit, new, detail), not main nav screens. */
export function GoBack() {
  const pathname = usePathname();
  const router = useRouter();

  if (TOP_LEVEL_ROUTES.has(pathname)) {
    return null;
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="-ml-2 mb-3 h-8 gap-1 px-2 text-muted-foreground hover:text-foreground"
      onClick={() => router.back()}
    >
      <ChevronLeft className="h-4 w-4" />
      Go back
    </Button>
  );
}

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default function MainSectionError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md space-y-4 py-8">
      <h2 className="text-lg font-medium">Something went wrong</h2>
      <p className="text-sm text-muted-foreground">
        {error?.message || "This page hit an unexpected error."}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={() => reset()}>
          Try again
        </Button>
        <Link href="/" className={cn(buttonVariants({ size: "sm", variant: "outline" }))}>
          Home
        </Link>
      </div>
    </div>
  );
}

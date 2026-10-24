"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function RootError({ error, reset }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body className="flex min-h-screen items-center justify-center p-6 font-sans">
        <div className="max-w-md space-y-4 text-center">
          <h1 className="text-lg font-medium">Application error</h1>
          <p className="text-sm text-neutral-600">
            {error?.message || "Something failed while loading the app."}
          </p>
          <Button type="button" size="sm" onClick={() => reset()}>
            Try again
          </Button>
        </div>
      </body>
    </html>
  );
}

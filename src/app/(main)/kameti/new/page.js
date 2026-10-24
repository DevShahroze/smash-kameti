"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { KametiSetupForm } from "@/components/kameti/kameti-setup-form";
import { useAuth } from "@/components/providers/auth-provider";

export default function NewKametiPage() {
  const router = useRouter();
  const { isAdmin } = useAuth();

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/kameti");
    }
  }, [isAdmin, router]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-medium">New Kameti</h1>
      </div>
      <KametiSetupForm />
    </div>
  );
}

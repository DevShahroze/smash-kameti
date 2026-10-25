"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/api/client";
import dynamic from "next/dynamic";

const OutingForm = dynamic(
  () =>
    import("@/components/outings/outing-form").then((mod) => ({
      default: mod.OutingForm,
    })),
  {
    loading: () => (
      <p className="text-sm text-muted-foreground">Loading form…</p>
    ),
  },
);
import { useAuth } from "@/components/providers/auth-provider";

export default function NewOutingClient() {
  const router = useRouter();
  const { isAdmin } = useAuth();
  const searchParams = useSearchParams();
  const prefill = {
    paymentSystem:
      searchParams.get("paymentSystem") ||
      searchParams.get("type") ||
      undefined,
    kametiTurnId: searchParams.get("kametiTurnId") || undefined,
    hostMemberId: searchParams.get("hostMemberId") || undefined,
    hostMemberName: searchParams.get("hostMemberName") || undefined,
    weekNumber: searchParams.get("weekNumber") || undefined,
    actualDate: searchParams.get("actualDate") || undefined,
    status: searchParams.get("status") || undefined,
  };

  const kametiTurnId = prefill.kametiTurnId;
  const isKametiBill =
    prefill.paymentSystem === "kameti" && Boolean(kametiTurnId);

  useEffect(() => {
    if (!isAdmin) {
      router.replace("/outings");
    }
  }, [isAdmin, router]);

  useEffect(() => {
    if (!kametiTurnId) {
      return;
    }
    let cancelled = false;
    apiFetch(`/api/kameti/turns/${kametiTurnId}`)
      .then((turn) => {
        if (!cancelled && turn?.outingId) {
          router.replace(`/outings/${turn.outingId}`);
        }
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [kametiTurnId, router]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-2">
      <h1 className="text-lg font-medium">
        {isKametiBill ? "Add Kameti bill" : "Add outing"}
      </h1>
      <OutingForm prefill={prefill} />
    </div>
  );
}

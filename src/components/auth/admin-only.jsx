"use client";

import { useAuth } from "@/components/providers/auth-provider";

export function AdminOnly({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return null;
  }
  return children;
}

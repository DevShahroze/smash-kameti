"use client";

import { memo } from "react";
import { useAuth } from "@/components/providers/auth-provider";

export const AdminOnly = memo(function AdminOnly({ children }) {
  const { isAdmin } = useAuth();
  if (!isAdmin) {
    return null;
  }
  return children;
});

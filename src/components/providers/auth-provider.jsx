"use client";

import { createContext, useContext, useLayoutEffect, useMemo } from "react";
import { ROLES } from "@/lib/auth/session";
import { setActivityLoggingEnabled } from "@/lib/logging/activity-logger";

const AuthContext = createContext({
  role: ROLES.GUEST,
  isAdmin: false,
  isGuest: true,
});

export function AuthProvider({ role, children }) {
  const value = useMemo(
    () => ({
      role,
      isAdmin: role === ROLES.ADMIN,
      isGuest: role === ROLES.GUEST,
    }),
    [role],
  );

  useLayoutEffect(() => {
    setActivityLoggingEnabled(role === ROLES.ADMIN);
  }, [role]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

"use client";

import { createContext, useContext, useMemo } from "react";
import { ROLES } from "@/lib/auth/session";

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
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

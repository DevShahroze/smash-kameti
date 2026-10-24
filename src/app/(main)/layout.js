import { cookies } from "next/headers";
import { AppShell } from "@/components/layout/app-shell";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/sonner";
import { COOKIE_NAME, parseSessionToken, ROLES } from "@/lib/auth/session";

export default async function MainLayout({ children }) {
  const cookieStore = await cookies();
  const session = await parseSessionToken(cookieStore.get(COOKIE_NAME)?.value);
  const role = session?.role ?? ROLES.GUEST;

  return (
    <QueryProvider>
      <AuthProvider role={role}>
        <AppShell role={role}>{children}</AppShell>
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </QueryProvider>
  );
}

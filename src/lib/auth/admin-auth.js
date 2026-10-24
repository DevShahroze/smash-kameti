import AdminUser from "@/models/AdminUser";
import { verifyPassword } from "@/lib/auth/password";
import { ensureDefaultAdmin } from "@/lib/auth/seed-admin";

export async function authenticateAdmin(email, password) {
  await ensureDefaultAdmin();
  const normalized = email?.trim().toLowerCase();
  if (!normalized || !password) {
    return null;
  }
  const admin = await AdminUser.findOne({ email: normalized });
  if (!admin) {
    return null;
  }
  const ok = await verifyPassword(password, admin.passwordHash);
  if (!ok) {
    return null;
  }
  return admin;
}

import AdminUser from "@/models/AdminUser";
import { hashPassword } from "@/lib/auth/password";

let seeded = false;

/** Create default admin from ADMIN_EMAIL + ADMIN_PASSWORD when no admin exists. */
export async function ensureDefaultAdmin() {
  if (seeded) {
    return;
  }
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    seeded = true;
    return;
  }

  const existing = await AdminUser.findOne({ email }).lean();
  if (!existing) {
    const passwordHash = await hashPassword(password);
    await AdminUser.create({ email, passwordHash });
  }

  seeded = true;
}

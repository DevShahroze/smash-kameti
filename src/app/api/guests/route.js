import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { guestSchema } from "@/lib/validation/schemas";
import Guest from "@/models/Guest";
import { requireAdminApi } from "@/lib/auth/require-admin-api";

export async function GET() {
  try {
    await connectDB();
    const guests = await Guest.find().sort({ name: 1 }).lean();
    return jsonOk(guests);
  } catch (err) {
    console.error(err);
    return jsonError("Failed to load guests", 500);
  }
}

export async function POST(request) {
  const denied = await requireAdminApi();
  if (denied) {
    return denied;
  }
  try {
    await connectDB();
    const body = await parseBody(request);
    const parsed = guestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }
    const guest = await Guest.create(parsed.data);
    return jsonOk(guest, 201);
  } catch (err) {
    console.error(err);
    return jsonError("Failed to create guest", 500);
  }
}

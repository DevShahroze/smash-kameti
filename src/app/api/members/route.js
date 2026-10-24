import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { memberSchema } from "@/lib/validation/schemas";
import Member from "@/models/Member";

export async function GET() {
  try {
    await connectDB();
    const members = await Member.find().sort({ fullName: 1 }).lean();
    return jsonOk(members);
  } catch (err) {
    console.error(err);
    return jsonError("Failed to load members", 500);
  }
}

export async function POST(request) {
  try {
    await connectDB();
    const body = await parseBody(request);
    const parsed = memberSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }
    const member = await Member.create(parsed.data);
    return jsonOk(member, 201);
  } catch (err) {
    console.error(err);
    return jsonError("Failed to create member", 500);
  }
}

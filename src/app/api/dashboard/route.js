import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError } from "@/lib/api/http";
import { getDashboardData } from "@/lib/services/dashboard";

export async function GET() {
  try {
    await connectDB();
    const data = await getDashboardData();
    return jsonOk(data);
  } catch (err) {
    console.error(err);
    return jsonError("Failed to load dashboard", 500);
  }
}

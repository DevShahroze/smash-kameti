import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError } from "@/lib/api/http";
import KametiTurn from "@/models/KametiTurn";
import { parseObjectId } from "@/lib/security/sanitize";

export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const rotationId = parseObjectId(
      searchParams.get("rotationId"),
      "rotationId",
    );
    if (!rotationId) {
      return jsonError("rotationId is required", 400);
    }
    const turns = await KametiTurn.find({ rotationId })
      .sort({ turnNumber: 1 })
      .lean();
    return jsonOk(turns);
  } catch (err) {
    if (err?.message?.startsWith("Invalid ")) {
      return jsonError(err.message, 400);
    }
    console.error(err);
    return jsonError("Failed to load turns", 500);
  }
}

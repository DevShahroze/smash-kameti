import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError } from "@/lib/api/http";
import Transaction from "@/models/Transaction";

export async function DELETE(_request, { params }) {
  try {
    await connectDB();
    const { id } = await params;
    const tx = await Transaction.findById(id);
    if (!tx) {
      return jsonError("Transaction not found", 404);
    }
    if (tx.source === "outing_sync") {
      return jsonError(
        "Outing-linked entries cannot be deleted here. Edit the outing or remove it from Outings.",
        400,
      );
    }
    await tx.deleteOne();
    return jsonOk({ deleted: true });
  } catch (err) {
    console.error(err);
    return jsonError("Failed to delete transaction", 500);
  }
}

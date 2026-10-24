import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { z } from "zod";
import { setSettlementRowSettled } from "@/lib/services/settlement-rows";

const bodySchema = z.object({
  scope: z.enum(["kameti", "american", "overall"]),
  fromMemberId: z.string().min(1),
  toMemberId: z.string().min(1),
  amountPaisa: z.number().int().positive(),
  settled: z.boolean(),
});

export async function PATCH(request) {
  try {
    await connectDB();
    const body = await parseBody(request);
    const parsed = bodySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }
    if (parsed.data.fromMemberId === parsed.data.toMemberId) {
      return jsonError("Sender and receiver must differ", 400);
    }
    const row = await setSettlementRowSettled(parsed.data);
    return jsonOk({ ok: true, row });
  } catch (err) {
    console.error(err);
    return jsonError(err.message || "Failed to update settlement row", 500);
  }
}

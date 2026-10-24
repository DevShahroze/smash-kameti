import { connectDB } from "@/lib/db/connect";
import { jsonOk, jsonError, parseBody } from "@/lib/api/http";
import { settingsSchema } from "@/lib/validation/schemas";
import GroupSettings from "@/models/GroupSettings";
import { requireAdminApi } from "@/lib/auth/require-admin-api";

async function getOrCreateSettings() {
  let settings = await GroupSettings.findOne();
  if (!settings) {
    settings = await GroupSettings.create({});
  }
  return settings;
}

export async function GET() {
  try {
    await connectDB();
    const settings = await getOrCreateSettings();
    return jsonOk(settings);
  } catch (err) {
    console.error(err);
    return jsonError("Failed to load settings", 500);
  }
}

export async function PATCH(request) {
  const denied = await requireAdminApi();
  if (denied) {
    return denied;
  }
  try {
    await connectDB();
    const body = await parseBody(request);
    const parsed = settingsSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError("Validation failed", 400, parsed.error.flatten());
    }
    const settings = await getOrCreateSettings();
    Object.assign(settings, parsed.data);
    await settings.save();
    return jsonOk(settings);
  } catch (err) {
    console.error(err);
    return jsonError("Failed to update settings", 500);
  }
}

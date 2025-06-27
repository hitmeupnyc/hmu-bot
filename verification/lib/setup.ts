import {
  HonoBindings,
  SetupOptions,
  SetupFailureReason,
  setupFailureReasons,
} from "..";
import { fetchSheet } from "./google-sheets";
import { retrieveSheetId } from "./utils";

export async function setupRoles(
  env: HonoBindings,
  options: SetupOptions,
): Promise<{ ok: true } | { ok: false; reason: SetupFailureReason }> {
  const vettedRoleId =
    options.find((o) => o.name === "vetted-role")?.value || "";
  const privateRoleId =
    options.find((o) => o.name === "private-role")?.value || "";
  try {
    await Promise.all([
      env.hmu_bot.put("vetted", vettedRoleId),
      env.hmu_bot.put("private", privateRoleId),
    ]);
    return { ok: true };
  } catch (e) {
    console.log("[ERR]", e);
  }

  return {
    ok: false,
    reason: setupFailureReasons.errorFetching,
  };
}

export async function setupSheet(
  env: HonoBindings,
  options: any,
): Promise<
  { ok: true; data: string[] } | { ok: false; reason: SetupFailureReason }
> {
  const url = options.find(
    (o) => o.custom_id === "sheet-url" || o.name === "sheet-url",
  );
  const documentId = url ? retrieveSheetId(url.value) : "";
  if (!documentId) {
    return { ok: false, reason: setupFailureReasons.invalidUrl };
  }

  // Store sheet ID and role IDs
  const vettedRole = options.find(
    (o) => o.custom_id === "vetted-role" || o.name === "vetted-role",
  );
  const privateRole = options.find(
    (o) => o.custom_id === "private-role" || o.name === "private-role",
  );

  await Promise.all([
    env.hmu_bot.put("sheet", documentId),
    env.hmu_bot.put("vetted", vettedRole?.value || ""),
    env.hmu_bot.put("private", privateRole?.value || ""),
  ]);

  try {
    const data = await Promise.all([
      fetchSheet(documentId, "Vetted Members!D1"),
      fetchSheet(documentId, "Private Members!D1"),
    ]);

    const columnHeadings = data.flatMap((d) => d.values.flat());
    console.log(`[setup] columnHeadings: ${columnHeadings.join(", ")}`);
    if (!columnHeadings.every((h) => h === "Email Address")) {
      return { ok: false, reason: setupFailureReasons.wrongHeadings };
    }

    return { ok: true, data: columnHeadings };
  } catch (e) {
    console.log("[ERR]", e);
  }

  return {
    ok: false,
    reason: setupFailureReasons.errorFetching,
  };
}

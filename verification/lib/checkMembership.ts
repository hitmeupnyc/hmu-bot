import { fetchSheet } from "./google-sheets";
import { cleanEmail, getEmailListFromSheetValues } from "./utils";

export const checkMembership = async (c: any, email: string) => {
  const documentId = await c.env.hmu_bot.get("sheet");
  if (!documentId) {
    throw new Error("no 'sheet' in KV store");
  }
  const [vettedSheet, privateSheet] = await Promise.all([
    fetchSheet(documentId, "Vetted Members!C2:C"),
    fetchSheet(documentId, "Private Members!C2:C"),
  ]);

  if (!vettedSheet.values) {
    throw new Error("Couldn't find the Vetted list.");
  }
  if (!privateSheet.values) {
    throw new Error("Couldn't find the Private list.");
  }

  const lcEmail = cleanEmail(email);

  const vettedEmails = getEmailListFromSheetValues(vettedSheet.values);
  const isVetted = vettedEmails.some((e) => e.toLowerCase().includes(lcEmail));

  const privateEmails = getEmailListFromSheetValues(privateSheet.values);
  const isPrivate = privateEmails.some((e) =>
    e.toLowerCase().includes(lcEmail),
  );
  console.log(
    `[checkMembership] ${email} is ${isVetted ? "vetted" : "not vetted"} and ${
      isPrivate ? "private" : "not private"
    }`,
  );
  return { isVetted, isPrivate };
};

export const retrieveSheetId = (url: string) => {
  const match = url.match(/\/d\/([^/]+)\/edit/);
  return match ? match[1] : null;
};

export const cleanEmail = (email: string) => {
  return email.trim().toLowerCase();
};

const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export const sanitizeEmail = (arbitraryText: string) => {
  return arbitraryText.replace(emailRegex, (match) => {
    const [local, domain] = match.split("@");
    return `${local[0]}${"*".repeat(local.length - 1)}@${domain}`;
  });
};

export const getEmailListFromSheetValues = (sheetValues: any[]) =>
  sheetValues.flatMap((v) => v.flat()).filter((x) => Boolean(x)) as string[];
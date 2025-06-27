import { getAccessToken } from "./google-auth";
import { retry } from "./lib/retry";

let accessToken = "";
let reloadAccessToken = async () => {};

export function init(privateKey: string) {
  const alreadyHadToken = accessToken !== "";
  reloadAccessToken = async () => {
    accessToken = await getAccessToken(privateKey);
  };
  return { alreadyHadToken, reloadAccessToken };
}

export async function fetchSheet(id: string, range: string) {
  return await retry(async () => {
    const res = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(
        range,
      )}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );
    const output = await res.json();
    console.log("SHEETS", res.ok, res.status);
    if (!res.ok) {
      console.log("SHEETS", JSON.stringify(output));
      throw new Error(
        "Something went wrong while retrieving the list of emails.",
      );
    }
    return output;
  }, {
    retries: 3,
    delayMs: 1000,
    onRetry: async (error, attempt) => {
      console.log(`request failed, retry #${attempt}`, error);
      await reloadAccessToken();
    }
  });
}


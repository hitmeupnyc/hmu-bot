import { retry, retryConfigs } from "./lib/retry.js";

export async function fetchEmailFromCode(
  code: string,
  clientId: string,
  clientSecret: string,
  oauthDestination: string,
) {
  try {
    const res = await retry(
      () =>
        fetch("https://discord.com/api/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: `client_id=${clientId}&client_secret=${clientSecret}&grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(
            oauthDestination,
          )}`,
        }),
      retryConfigs.network,
    );
    const data = await res.json();
    const identityRes = await fetch("https://discord.com/api/users/@me", {
      headers: {
        Authorization: `Bearer ${data.access_token}`,
      },
    });
    const { id, email, verified } = await identityRes.json();
    return { id, email, verified };
  } catch (e) {
    console.error("[discord][fetchEmailFromCode]", e);
    return { id: "", email: "", verified: false };
  }
}

export async function grantRole(token, guildId, roleId, userId) {
  console.log(`[discord][grantRole] granting user ${userId} role ${roleId}`);
  const res = await retry(
    () =>
      fetch(
        `https://discord.com/api/guilds/${guildId}/members/${userId}/roles/${roleId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bot ${token}`,
          },
        },
      ),
    retryConfigs.network,
  );

  return res;
}

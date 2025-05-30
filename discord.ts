export async function fetchEmailFromCode(
  code: string,
  clientId: string,
  clientSecret: string,
  oauthDestination: string,
) {
  try {
    const res = await retry(() =>
      fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `client_id=${clientId}&client_secret=${clientSecret}&grant_type=authorization_code&code=${code}&redirect_uri=${encodeURIComponent(
          oauthDestination,
        )}`,
      }),
    );
    const data = await res.json();
    console.log(
      "[discord][fetchEmailFromCode]",
      res.status,
      res.ok ? "" : data,
    );
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
  const res = await retry(() =>
    fetch(
      `https://discord.com/api/guilds/${guildId}/members/${userId}/roles/${roleId}`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bot ${token}`,
        },
      },
    ),
  );

  return res;
}

function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const attempt = (retryCount: number) => {
      fn()
        .then(resolve)
        .catch(async (error) => {
          if (retryCount <= 0) {
            reject(error);
          } else {
            setTimeout(() => {
              attempt(retryCount - 1);
            }, delayMs * Math.pow(2, retries - retryCount));
          }
        });
    };

    attempt(retries);
  });
}

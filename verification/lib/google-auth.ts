import { Base64 } from "js-base64";

const { subtle } = globalThis.crypto;

const SERVICE_ACCOUNT = {
  type: "service_account",
  project_id: "auth-project-189019",
  private_key_id: "68afb592c1d3108f5fa04da86a9089d0d418e3b3",
  // private_key: "",
  client_email: "hmu-bot@auth-project-189019.iam.gserviceaccount.com",
  client_id: "116274722892340415772",
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url:
    "https://www.googleapis.com/robot/v1/metadata/x509/hmu-bot%40auth-project-189019.iam.gserviceaccount.com",
  universe_domain: "googleapis.com",
};

export async function getAccessToken(privateKey: string) {
  const jwt = await generateJwt(privateKey);

  const res = await fetch(`https://oauth2.googleapis.com/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Bearer ${jwt}`,
    },
    body: `grant_type=${encodeURIComponent(
      "urn:ietf:params:oauth:grant-type:jwt-bearer",
    )}&assertion=${jwt}`,
  });
  const data = await res.json();
  return data.access_token;
}

async function generateJwt(privateKey: string) {
  const header = Base64.encodeURI(
    JSON.stringify({
      alg: "RS256",
      typ: "JWT",
      kid: SERVICE_ACCOUNT.private_key_id,
    }),
  );
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const payload = Base64.encodeURI(
    JSON.stringify({
      iss: SERVICE_ACCOUNT.client_email,
      sub: SERVICE_ACCOUNT.client_email,
      scope:
        "https://www.googleapis.com/auth/prediction https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp,
      iat,
    }),
  );

  const textEncoder = new TextEncoder();
  const inputArrayBuffer = textEncoder.encode(`${header}.${payload}`);

  const outputArrayBuffer = await subtle.sign(
    { name: "RSASSA-PKCS1-v1_5" },
    await importPrivateKey(privateKey),
    inputArrayBuffer,
  );

  const signature = Base64.fromUint8Array(
    new Uint8Array(outputArrayBuffer),
    true,
  );
  const token = `${header}.${payload}.${signature}`;
  return token;
}

const pemHeader = "-----BEGIN PRIVATE KEY-----";
const pemFooter = "-----END PRIVATE KEY-----";
function importPrivateKey(pem: string) {
  const parsedPem = pem.replace(/\n/g, "");

  if (!parsedPem.startsWith(pemHeader) || !parsedPem.endsWith(pemFooter)) {
    throw new Error("Invalid service account private key");
  }

  const pemContents = parsedPem.substring(
    pemHeader.length,
    parsedPem.length - pemFooter.length,
  );

  const buffer = Base64.toUint8Array(pemContents);

  const algorithm = {
    name: "RSASSA-PKCS1-v1_5",
    hash: {
      name: "SHA-256",
    },
  };

  return subtle.importKey("pkcs8", buffer, algorithm, false, ["sign"]);
}

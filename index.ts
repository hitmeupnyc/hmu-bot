// started with https://developers.cloudflare.com/workers/get-started/quickstarts/
import {
  MessageComponentTypes,
  ButtonStyleTypes,
  verifyKey,
  InteractionResponseType,
  TextStyleTypes,
  InteractionResponseFlags,
} from "discord-interactions";
import { Hono } from "hono";
import { logger } from "hono/logger";

import { KVNamespace } from "@cloudflare/workers-types";
import { fetchSheet, init } from "./google-sheets";
import { fetchEmailFromCode, grantRole } from "./discord";
import { layout, success } from "./templates";
import { sendEmail } from "./mailjet";
import OTP from "otp";

type HonoBindings = {
  DISCORD_APP_ID: string;
  DISCORD_GUILD_ID: string;
  DISCORD_PUBLIC_KEY: string;
  DISCORD_TOKEN: string;
  DISCORD_SECRET: string;
  DISCORD_OAUTH_DESTINATION: string;
  GOOGLE_SA_PRIVATE_KEY: string;
  MAILJET_PUBLIC: string;
  MAILJET_KEY: string;
  hmu_bot: KVNamespace;
};

const app = new Hono<{
  Bindings: HonoBindings;
}>();

app.use(logger());

app.get("/2a3df3582beb0e90854fb9819c88e36e.txt", (c) => c.text(""));

app.use("/*", async (c, next) => {
  const { alreadyHadToken, reloadAccessToken } = init(
    c.env.GOOGLE_SA_PRIVATE_KEY,
  );
  if (!alreadyHadToken) {
    await reloadAccessToken();
  }
  await next();
});

// Discord signature verification
app.use("/discord", async (c, next) => {
  const isValidRequest = await verifyKey(
    await c.req.arrayBuffer(),
    c.req.header("X-Signature-Ed25519")!,
    c.req.header("X-Signature-Timestamp")!,
    c.env.DISCORD_PUBLIC_KEY,
  );
  if (!isValidRequest) {
    console.log("[REQ] Invalid request signature");
    return c.json({ message: "Bad request signature" }, 401);
  }

  await next();
});

// Actual logic
app.post("/discord", async (c) => {
  const interaction = await c.req.json();
  console.log(
    `interaction type: ${interaction.type}. custom_id: ${interaction.data?.custom_id}`,
  );

  // top-level interactions (slash commands etc)
  switch (interaction.type) {
    case 1:
      return c.json({ type: 1, data: {} });
    case 2: {
      if (interaction.data.name === "setup") {
        const setupResult = await setup(c.env, interaction.data.options);

        if (setupResult.ok) {
          return c.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              content: `Welcome to Hit Me Up NYC! Please verify your account to gain access to the correct private spaces.`,
              components: [
                {
                  type: MessageComponentTypes.ACTION_ROW,
                  components: [
                    {
                      type: MessageComponentTypes.BUTTON,
                      style: ButtonStyleTypes.LINK,
                      label: "Verify me",
                      url: `https://discord.com/oauth2/authorize?client_id=1255713553965518859&response_type=code&redirect_uri=${encodeURIComponent(
                        c.env.DISCORD_OAUTH_DESTINATION,
                      )}&scope=email+identify`,
                    },
                    {
                      type: MessageComponentTypes.BUTTON,
                      style: ButtonStyleTypes.SECONDARY,
                      label: "Manually verify email",
                      custom_id: "manual-verify",
                    },
                  ],
                },
              ],
            },
          });
        }
        return c.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Something broke! Here's all I know: '${setupResult.reason}'`,
          },
        });
      }
      if (interaction.data.name === "verify-email") {
        const emailOption = interaction.data.options.find(
          (x) => x.name === "email",
        );
        const email = emailOption.value;
        if (!email) {
          return c.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              flags: InteractionResponseFlags.EPHEMERAL,
              content: `Needed an email (${email ? "ok" : "not ok"})`,
            },
          });
        }
        try {
          const { isVetted, isPrivate } = await checkMembership(c, email);
          return c.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              flags: InteractionResponseFlags.EPHEMERAL,
              content: `This email ${
                isVetted ? "IS" : "is NOT"
              } a vetted member and ${
                isPrivate ? "IS" : "is NOT"
              } a private member`,
            },
          });
        } catch (e) {
          return c.json({
            type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
            data: {
              flags: InteractionResponseFlags.EPHEMERAL,
              content: `Something went wrong checking membership. ${e.message}`,
            },
          });
        }
      }
    }
    case 3: {
      if (interaction.data.custom_id === "manual-verify") {
        return c.json({
          type: InteractionResponseType.MODAL,
          data: {
            custom_id: "modal-verify-email",
            title: "What email do you subscribe to HMU with?",
            components: [
              {
                type: 1,
                components: [
                  {
                    type: MessageComponentTypes.INPUT_TEXT,
                    custom_id: "email",
                    label: "Email",
                    style: TextStyleTypes.SHORT,
                    max_length: 100,
                    placeholder: "calvin@gross.edu",
                    required: true,
                  },
                ],
              },
            ],
          },
        });
      }

      if (interaction.data.custom_id.includes("verify-email")) {
        const [_, email] = interaction.data.custom_id.split("verify-email:");
        return c.json({
          type: InteractionResponseType.MODAL,
          data: {
            custom_id: `modal-confirm-code:${email}`,
            title: "Confirmation code:",
            components: [
              {
                type: 1,
                components: [
                  {
                    type: MessageComponentTypes.INPUT_TEXT,
                    custom_id: "code",
                    label: "Confirmation code",
                    style: TextStyleTypes.SHORT,
                    min_length: 6,
                    max_length: 6,
                    placeholder: "000000",
                    required: true,
                  },
                ],
              },
            ],
          },
        });
      }
    }
    case 5: {
      if (interaction.data.custom_id === "modal-verify-email") {
        // Send verification email, respond with a new modal for code
        const email = cleanEmail(
          interaction.data.components[0].components[0].value,
        );
        const otpGen = new OTP();
        const otp = otpGen.hotp(0);
        await sendEmail(
          email,
          otp,
          `${c.env.MAILJET_PUBLIC}:${c.env.MAILJET_KEY}`,
        );
        // Store the OTP, keyed by their email. Set it to expire in 5 mins
        await c.env.hmu_bot.put(`email:${email}`, otp, {
          expirationTtl: 60 * 5,
        });

        return c.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: {
            content: `Thanks, check your email for a confirmation code from \`hello@hitmeupnyc.com\`! Make sure to check spam if you don't see it.`,
            flags: InteractionResponseFlags.EPHEMERAL,
            components: [
              {
                type: MessageComponentTypes.ACTION_ROW,
                components: [
                  {
                    type: MessageComponentTypes.BUTTON,
                    style: ButtonStyleTypes.PRIMARY,
                    custom_id: `verify-email:${email}`,
                    label: "Enter verification code",
                  },
                ],
              },
            ],
          },
        });
      }
      if (interaction.data.custom_id.includes("modal-confirm-code")) {
        const [_, rawEmail] = interaction.data.custom_id.split(
          "modal-confirm-code:",
        );
        const code = interaction.data.components[0].components[0].value;
        const email = cleanEmail(rawEmail);

        const userId = interaction.member.user.id;
        const [storedCode, vettedRoleId, privateRoleId] = await Promise.all([
          c.env.hmu_bot.get(`email:${email}`),
          c.env.hmu_bot.get("vetted"),
          c.env.hmu_bot.get("private"),
        ]);
        // check if code matches the one in the db
        if (code !== storedCode) {
          return c.json({
            type: InteractionResponseType.UPDATE_MESSAGE,
            data: { content: `That’s not the right code! Try again?` },
          });
        }
        try {
          const { isPrivate, isVetted } = await checkMembership(c, email);
          if (!isPrivate && !isVetted) {
            return c.json({
              type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
              data: {
                content: `That’s the right code, but you’re not on the list 👀 [Apply to join](https://www.hitmeupnyc.com/join)`,
                flags: InteractionResponseFlags.EPHEMERAL,
              },
            });
          }

          if (isVetted) {
            console.log(`Granting vetted role to user ${userId}`);
            const a = await grantRole(
              c.env.DISCORD_TOKEN,
              c.env.DISCORD_GUILD_ID,
              vettedRoleId,
              userId,
            );
            if (!a.ok) {
              console.log("Discord error:", a.status, await a.text());
            }
          }

          if (isPrivate) {
            console.log(`Granting private role to user ${userId}`);
            const a = await grantRole(
              c.env.DISCORD_TOKEN,
              c.env.DISCORD_GUILD_ID,
              privateRoleId,
              userId,
            );
            if (!a.ok) {
              console.log("Discord error:", a.status, await a.text());
            }
          }

          return c.json({
            type: InteractionResponseType.UPDATE_MESSAGE,
            data: {
              content: `Thank you! You’ve verified your email and have been granted access to private spaces ✨`,
              // Need to explicitly include 'no components' to clear them.
              components: [],
            },
          });
        } catch (e) {
          console.error(e);
          return c.json({
            type: InteractionResponseType.UPDATE_MESSAGE,
            data: {
              content: `Hmm you gave the right code, but something went wrong applying role: ${e.message} Ping one of the admins for help, vcarl wrote this bot.`,
            },
          });
        }
      }
    }
    case 9: {
    }
  }

  return c.json({ message: "Something went wrong" });
});
app.get("/oauth", async (c) => {
  // Currently this doesn't require that the user's email be verified in Discord
  const { id: userId, email } = await fetchEmailFromCode(
    c.req.query("code") || "",
    c.env.DISCORD_APP_ID,
    c.env.DISCORD_SECRET,
    c.env.DISCORD_OAUTH_DESTINATION,
  );

  const [vettedRoleId, privateRoleId] = await Promise.all([
    c.env.hmu_bot.get("vetted"),
    c.env.hmu_bot.get("private"),
  ]);

  if (!vettedRoleId || !privateRoleId) {
    console.error(
      "Couldn't load Discord Role IDs:",
      vettedRoleId,
      privateRoleId,
    );
    return c.html(
      layout(
        "<p>Oh no, for some reason a required value was missing. Please report this to the Discord admins, this shouldn't have been possible.</p>",
      ),
    );
  }
  try {
    const { isVetted, isPrivate } = await checkMembership(c, email);
    if (isVetted) {
      console.log(`Granting vetted role to user ${userId}`);
      await grantRole(
        c.env.DISCORD_TOKEN,
        c.env.DISCORD_GUILD_ID,
        vettedRoleId,
        userId,
      );
    }

    if (isPrivate) {
      console.log(`Granting private role to user ${userId}`);
      await grantRole(
        c.env.DISCORD_TOKEN,
        c.env.DISCORD_GUILD_ID,
        privateRoleId,
        userId,
      );
    }

    if (!isPrivate && !isVetted) {
      console.error("Email not found in mailing lists");
      return c.html(
        `<p>${email} was not found in the list of vetted members.</p>`,
      );
    }
  } catch (e) {
    console.error("Something went wrong:", e);
    return c.html(
      layout(
        "<p>Oh no, something went wrong while checking your membership! Please report this to the Discord admins, this shouldn't have been possible.</p>",
      ),
    );
  }

  return c.html(success());
});

const checkMembership = async (c: any, email: string) => {
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
  return { isVetted, isPrivate };
};

const getEmailListFromSheetValues = (sheetValues) =>
  sheetValues.flatMap((v) => v.flat()).filter((x) => Boolean(x)) as string[];

export default app;

enum ApplicationCommandOptionType {
  Subcommand = 1,
  SubcommandGroup = 2,
  String = 3,
  Integer = 4,
  Boolean = 5,
  User = 6,
  Channel = 7,
  Role = 8,
  Mentionable = 9,
  Number = 10,
  Attachment = 11,
}

type SetupOptions = (
  | {
      name: "sheet-url";
      type: ApplicationCommandOptionType.String;
      value: string;
    }
  | {
      name: "private-role";
      type: ApplicationCommandOptionType.Role;
      value: string;
    }
  | {
      name: "vetted-role";
      type: ApplicationCommandOptionType.Role;
      value: string;
    }
)[];

const setupFailureReasons = {
  invalidUrl: "That URL doesn’t look like a Google Sheet",
  errorFetching: "There was a problem fetching from the Google Sheet",
  wrongHeadings:
    "The Google Sheet provided did not have the sheet name or column headers expected. Looked for sheets named 'Private Members' and 'Vetted Members', looked for 'Email Address' in column D.",
} as const;
type SetupFailureReason =
  (typeof setupFailureReasons)[keyof typeof setupFailureReasons];

async function setup(
  env: HonoBindings,
  options: SetupOptions,
): Promise<
  { ok: true; data: string[] } | { ok: false; reason: SetupFailureReason }
> {
  const url = options.find((o) => o.name === "sheet-url");
  const vettedRoleId =
    options.find((o) => o.name === "vetted-role")?.value || "";
  const privateRoleId =
    options.find((o) => o.name === "private-role")?.value || "";
  const documentId = url ? retrieveSheetId(url.value) : "";
  if (!documentId) {
    return { ok: false, reason: setupFailureReasons.invalidUrl };
  }

  await Promise.all([
    env.hmu_bot.put("sheet", documentId),
    env.hmu_bot.put("vetted", vettedRoleId),
    env.hmu_bot.put("private", privateRoleId),
  ]);

  try {
    const data = await Promise.all([
      fetchSheet(documentId, "Vetted Members!D1"),
      fetchSheet(documentId, "Private Members!D1"),
    ]);

    const columnHeadings = data.flatMap((d) => d.values.flat());
    console.log({ columnHeadings });
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

const retrieveSheetId = (url: string) => {
  const match = url.match(/\/d\/([^/]+)\/edit/);
  return match ? match[1] : null;
};

const cleanEmail = (email: string) => {
  return email.toLowerCase();
};

const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

const sanitizeEmail = (arbitraryText: string) => {
  return arbitraryText.replace(emailRegex, (match) => {
    const [local, domain] = match.split("@");
    return `${local[0]}${"*".repeat(local.length - 1)}@${domain}`;
  });
};

const log = console.log.bind(console);
console.log = (...args) =>
  log(...args.map((i) => (typeof i === "string" ? sanitizeEmail(i) : i)));

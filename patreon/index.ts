import { Client, GatewayIntentBits, Partials } from "discord.js";
import { FREQUENCY, scheduleTask } from "./src/schedule.ts";

const makeLogger =
  (prefix, attr: "log" | "warn" | "error" = "log") =>
  (...args) =>
    console[attr](new Date(), prefix, ...args);

export const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember],
});

const CHANNELS = {
  n00dz: "1334571592633810964",
};

const privateRole = "1260328377940836462";
const vettedRole = "1260328524087033896";
const subscriberRole = "1334572997687771196";
const accessRole = "1336774844292923533";
// const privateRole = "1258145608628178964";
// const vettedRole = "1258145631231410376";
// const subscriberRole = "1351259749798121562";
// const accessRole = "1351259716617109634";

client
  .login(process.env.DISCORD_TOKEN)
  .then(() => {
    console.log("bot started…");
  })
  .catch((e) => {
    console.log({ e });
    console.log(
      `Failed to log into discord client. Make sure \`.env.local\` has a discord token. Tried to use '${process.env.DISCORD_TOKEN}'`,
    );
    console.log(
      'You can get a new discord token at https://discord.com/developers/applications, selecting your client (or making a new one), navigating to "client", and clicking "Copy" under "Click to reveal token"',
    );
    process.exit(1);
  });

client.on("ready", (bot) => {
  scheduleTask(FREQUENCY.weekly, async () => {
    const channel = await bot.channels.fetch(CHANNELS.n00dz);
    if (channel.isSendable()) {
      await channel.send(`# The #n00dz r00lz

1. This is a **PRIVATE CHANNEL**.  Everything posted and discussed here is to remain here.  That means _ABSOLUTELY NO_ outside sharing of others photos/videos/comments posted in this channel.
2. You may only post content of yourself.  If you want to post content of you with other people, you must have the consent of every individual in the photo/video prior to posting.
3. Effort must be put into the post!  Avoid just posting closeups of your genitals. Generally keep your nudes body and/or face oriented.
4. No sliding into DMs! If you would like to DM someone, always ask here first.
5. Be respectful. No harassment of any kind will be tolerated. The [Hit Me Up Consent Policy](https://www.hitmeupnyc.com/consent) applies here. 
6. Any violation of these rules will result in immediate lifetime ban from Hit Me Up.

Have fun, and happy posting!`);
    }
  });
});

client.on("guildMemberUpdate", async (oldMember, newMember) => {
  const log = makeLogger(`${oldMember.id} (${oldMember.displayName})`);
  log(`Partials? new: ${newMember.partial}, old: ${oldMember.partial}`);
  [newMember, oldMember] = await Promise.all([
    newMember.partial ? newMember.fetch() : Promise.resolve(newMember),
    oldMember.partial ? oldMember.fetch() : Promise.resolve(oldMember),
  ]);
  log(
    `had ${oldMember.roles.cache.size} roles, now ${
      newMember.roles.cache.size
    }: (${newMember.roles.cache.map((r) => r.name).join(",")})`,
  );
  // Disabled because Discord apparently is not super reliable at emitting the
  // information required to use it. Spotted an instance in practice where a role
  // change wasn't reflected in old/new data
  // if (
  //   oldMember.roles.cache.size === newMember.roles.cache.size &&
  //   oldMember.roles.cache.every((r) => newMember.roles.cache.has(r.id))
  // )

  if (newMember.roles.cache.has(accessRole)) {
    // If they have the access role but not private+patreon, remove the access role
    if (
      !newMember.roles.cache.hasAll(privateRole, subscriberRole) &&
      !newMember.roles.cache.hasAll(vettedRole, subscriberRole)
    ) {
      log(`Outcome: no longer has private+patreon, removing access`);
      await newMember.roles.remove(accessRole);
    }
    return;
  }
  if (
    !newMember.roles.cache.has(accessRole) &&
    (newMember.roles.cache.hasAll(subscriberRole, privateRole) ||
      newMember.roles.cache.hasAll(subscriberRole, vettedRole))
  ) {
    log(`Outcome: now has access to subscriber channels`);
    await newMember.roles.add(accessRole);
    return;
  }
  log(`Outcome: update ignored`);
});

process.on("unhandledRejection", console.error);
process.on("uncaughtException", console.error);

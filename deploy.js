import {
  PermissionFlagsBits,
  REST,
  Routes,
  SlashCommandBuilder,
} from "discord.js";

const GUILD_ID = process.env.DISCORD_GUILD_ID;

const commands = [
  new SlashCommandBuilder()
    .setName("setup")
    .setDescription("Set up necessities for using the bot")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((x) =>
      x
        .setName("sheet-url")
        .setDescription(
          "The Google Sheet to cross-reference for verified members",
        )
        .setRequired(true),
    )
    .addRoleOption((x) =>
      x
        .setName("vetted-role")
        .setDescription("The role to grant to Vetted members")
        .setRequired(true),
    )
    .addRoleOption((x) =>
      x
        .setName("private-role")
        .setDescription("The role to grant to Private members")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("verify-email")
    .setDescription(
      "Manually verify that an email address is in the member list.",
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addStringOption((x) =>
      x
        .setName("email")
        .setDescription("Their email address")
        .setRequired(true),
    ),
];

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
  try {
    console.log(`Deploying ${commands.length} commands.`);
    const data = await rest.put(
      Routes.applicationGuildCommands(process.env.DISCORD_APP_ID, GUILD_ID),
      { body: commands },
    );

    console.log(`Successfully reloaded ${data.length} commands.`);
  } catch (error) {
    // And of course, make sure you catch and log any errors!
    console.error(error);
  }
})();

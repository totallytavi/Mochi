const { SlashCommandBuilder } = require("@discordjs/builders");
// eslint-disable-next-line no-unused-vars
const { Client, CommandInteraction, CommandInteractionOptionResolver } = require("discord.js");
const { interactionEmbed, parseTime } = require("../functions.js");
const config = require("../config.json");

module.exports = {
  name: "ban",
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Bans a user")
    .addUserOption(option => {
      return option
        .setName("user")
        .setDescription("The user to ban")
        .setRequired(true);
    })
    .addStringOption(option => {
      return option
        .setName("reason")
        .setDescription("The reason for the ban")
        .setRequired(true);
    })
    .addStringOption(option => {
      return option
        .setName("length")
        .setDescription("The length for the ban (1h2m, 1h, etc.)")
        .setRequired(false);
    }),
  /**
   * @param {Client} client
   * @param {CommandInteraction} interaction
   * @param {CommandInteractionOptionResolver} options
   */
  run: async (client, interaction, options) => {
    const user = options.getMember("user");
    const reason = options.getString("reason") ?? "No reason specified";
    let error = false;

    //#region Validation
    // Check executions
    if(user != null && user === interaction.member) return interactionEmbed(3, "[ERR-ARGS]", "You cannot ban yourself", interaction, client, [true, 10]);
    if(user.user.bot) return interactionEmbed(3, "[ERR-ARGS]", "Bots cannot be banned", interaction, client, [true, 10]);
    // Executor permissions
    if(!interaction.member.permissions.has("BAN_MEMBERS") && !interaction.member.roles.has(config.discord.devRole)) return interactionEmbed(3, "[ERR-UPRM]", "You do not have permission to ban members", interaction, client, [true, 10]);
    if(user != null &&  interaction.member.roles.highest.comparePositionTo(user.roles.highest) <= 0) return interactionEmbed(3, "[ERR-UPRM]", "You cannot ban someone equal to or higher than you on the role hierarchy", interaction, client, [true, 10]);
    // Bot permissions
    if(!interaction.guild.me.permissions.has("BAN_MEMBERS")) return interactionEmbed(3, "[ERR-BPRM]", "I do not have permission to ban members", interaction, client, [true, 10]);
    if(user != null &&  interaction.guild.me.roles.highest.comparePositionTo(user.roles.highest) <= 0) return interactionEmbed(3, "[ERR-BPRM]", "I cannot ban someone equal to or higher than me on the role hierarchy", interaction, client, [true, 10]);
    // Duration
    if(options.getString("length")) {
      var duration = parseTime(options.getString("length"));
      if(duration === "NaN") return interactionEmbed(3, "[ERR-ARGS]", "Duration is not a valid string", interaction, client, [true, 10]);
      if(duration < 0) return interactionEmbed(3, "[ERR-ARGS]", "Duration cannot be negative", interaction, client, [true, 10]);
    }
    //#endregion
    if(!user) {
      interaction.guild.bans.create(options.getUser("user"), { reason: reason });
      try {
        await client.models.Punishment.create({
          userId: user.id,
          modId: interaction.user.id,
          guildId: interaction.guild.id,
          type: "BAN",
          endsAt: new Date(Date.now() + duration), 
          active: true,
          deleted: false,
          reason: reason
        });
      } catch(e) {
        error = true;
        if(!e.errors) {
          interactionEmbed(3, "[ERR-SQL]", "An unknown error occured while adding the ban to the database", interaction, client, [true, 10]);
        } else {
          interactionEmbed(3, "[ERR-SQL]", `> ${e.errors.map(e => `\`${e.type}\` @ \`${e.path}\``).join("\n> ")}`, interaction, client, [true, 15]);
        }
      }
      if(error) return;

      return interactionEmbed(1, `Banned ${user} for: ${reason}`, interaction, client, [false, 0]);
    }

    // Ban the user
    await interaction.editReply({ content: "Adding the ban to the database" });
    user.send(`You have been banned from ${interaction.guild.name} for: ${reason}`).catch(() => {return;});
    user.ban({ reason: reason });
    try {
      await client.models.Punishment.create({
        userId: user.id,
        modId: interaction.user.id,
        guildId: interaction.guild.id,
        type: "BAN",
        endsAt: new Date(Date.now() + duration), 
        active: true,
        deleted: false,
        reason: reason
      });
    } catch(e) {
      error = true;
      if(!e.errors) {
        interactionEmbed(3, "[ERR-SQL]", "An unknown error occured while adding the ban to the database", interaction, client, [true, 10]);
      } else {
        interactionEmbed(3, "[ERR-SQL]", `> ${e.errors.map(e => `\`${e.type}\` @ \`${e.path}\``).join("\n> ")}`, interaction, client, [true, 15]);
      }
    }
    if(error) return;

    interactionEmbed(1, `Banned ${user} for: ${reason}`, interaction, client, [false, 0]);
  }
};
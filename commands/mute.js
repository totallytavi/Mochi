const { SlashCommandBuilder } = require("@discordjs/builders");
// eslint-disable-next-line no-unused-vars
const { Client, CommandInteraction, CommandInteractionOptionResolver } = require("discord.js");
const { interactionEmbed, parseTime } = require("../functions");
const config = require("../config.json");

module.exports = {
  name: "mute",
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Mutes a user with Discord's timeout function")
    .addUserOption(option => {
      return option
        .setName("user")
        .setDescription("The user to mute")
        .setRequired(true);
    })
    .addStringOption(option => {
      return option
        .setName("reason")
        .setDescription("The reason for the mute")
        .setRequired(true);
    })
    .addStringOption(option => {
      return option
        .setName("length")
        .setDescription("The length for the mute (1h2m, 1h, etc.)")
        .setRequired(false);
    }),
  /**
   * @param {Client} client
   * @param {CommandInteraction} interaction
   * @param {CommandInteractionOptionResolver} options
   */
  run: async (client, interaction, options) => {
    const user = options.getMember("user");
    const reason = options.getString("reason") ?? "None";
    let error = false;

    //#region Validation
    // Check if the user exists
    if(!user) return interactionEmbed(3, "[ERR-ARGS]", "That user does not exist in this server (Check your mutuals with them)", interaction, client, [true, 10]);
    // Check executions
    if(user === interaction.member) return interactionEmbed(3, "[ERR-ARGS]", "You cannot mute yourself", interaction, client, [true, 10]);
    if(user.user.bot) return interactionEmbed(3, "[ERR-ARGS]", "Bots cannot be muted", interaction, client, [true, 10]);
    // Executor permissions
    if(!interaction.member.permissions.has("MANAGE_ROLES") && !interaction.member.roles.has(config.discord.devRole)) return interactionEmbed(3, "[ERR-UPRM]", "You do not have permission to warn members", interaction, client, [true, 10]);
    if(interaction.member.roles.highest.comparePositionTo(user.roles.highest) <= 0) return interactionEmbed(3, "[ERR-UPRM]", "You cannot mute someone equal to or higher than you on the role hierarchy", interaction, client, [true, 10]);
    // Bot permissions
    if(!interaction.guild.me.permissions.has("MODERATE_MEMBERS")) return interactionEmbed(3, "[ERR-BPRM]", "I do not have permission to mute members", interaction, client, [true, 10]);
    if(interaction.guild.me.roles.highest.comparePositionTo(user.roles.highest) <= 0) return interactionEmbed(3, "[ERR-BPRM]", "I cannot mute someone equal to or higher than me on the role hierarchy", interaction, client, [true, 10]);
    // Duration
    if(options.getString("length")) {
      var duration = parseTime(options.getString("length"));
      if(duration === "NaN") return interactionEmbed(3, "[ERR-ARGS]", "Duration is not a valid string", interaction, client, [true, 10]);
      if(duration < 0) return interactionEmbed(3, "[ERR-ARGS]", "Duration cannot be negative", interaction, client, [true, 10]);
    }
    //#endregion

    // Mute the user
    await interaction.editReply({ content: "Adding the mute to the database" });
    user.send(`You have been muted in ${interaction.guild.name} for: ${reason}`).catch(() => {return;});
    user.timeout(duration, reason);
    try {
      await client.models.Punishment.create({
        userId: user.id,
        modId: interaction.user.id,
        type: "MUTE",
        endsAt: new Date(Date.now() + duration), 
        active: true,
        deleted: false,
        reason: reason
      });
    } catch(e) {
      error = true;
      if(!e.errors) {
        interactionEmbed(3, "[ERR-SQL]", "An unknown error occured while adding the mute to the database", interaction, client, [true, 10]);
      } else {
        interactionEmbed(3, "[ERR-SQL]", `> ${e.errors.map(e => `\`${e.type}\` @ \`${e.path}\``).join("\n> ")}`, interaction, client, [true, 15]);
      }
    }
    if(error) return;

    interactionEmbed(1, `Muted ${user} for: ${reason}`, interaction, client, [false, 0]);
  }
};
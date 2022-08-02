// eslint-disable-next-line no-unused-vars
const { Client, CommandInteraction, CommandInteractionOptionResolver, SlashCommandBuilder } = require("discord.js");
const { interactionEmbed } = require("../functions.js");
const config = require("../config.json");

module.exports = {
  name: "kick",
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Kicks a user")
    .addUserOption(option => {
      return option
        .setName("user")
        .setDescription("The user to kick")
        .setRequired(true);
    })
    .addStringOption(option => {
      return option
        .setName("reason")
        .setDescription("The reason for the kick")
        .setRequired(true);
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
    // Check if the user exists
    if(!user) return interactionEmbed(3, "[ERR-ARGS]", "That user does not exist in this server (Check your mutuals with them)", interaction, client, [true, 10]);
    // Check executions
    if(user === interaction.member) return interactionEmbed(3, "[ERR-ARGS]", "You cannot kick yourself", interaction, client, [true, 10]);
    if(user.user.bot) return interactionEmbed(3, "[ERR-ARGS]", "Bots cannot be kicked", interaction, client, [true, 10]);
    // Executor permissions
    if(!interaction.member.permissions.has("MANAGE_ROLES") && !interaction.member.roles.has(config.discord.devRole)) return interactionEmbed(3, "[ERR-UPRM]", "You do not have permission to warn members", interaction, client, [true, 10]);
    if(interaction.member.roles.highest.comparePositionTo(user.roles.highest) <= 0) return interactionEmbed(3, "[ERR-UPRM]", "You cannot kick someone equal to or higher than you on the role hierarchy", interaction, client, [true, 10]);
    // Bot permissions
    if(!interaction.guild.me.permissions.has("KICK_MEMBERS")) return interactionEmbed(3, "[ERR-BPRM]", "I do not have permission to kick members", interaction, client, [true, 10]);
    if(interaction.guild.me.roles.highest.comparePositionTo(user.roles.highest) <= 0) return interactionEmbed(3, "[ERR-BPRM]", "I cannot kick someone equal to or higher than me on the role hierarchy", interaction, client, [true, 10]);
    //#endregion

    // Kick the user
    await interaction.editReply({ content: "Adding the kick to the database" });
    user.send(`You have been kicked from ${interaction.guild.name} for: ${reason}`).catch(() => {return;});
    user.kick(reason);
    try {
      await client.models.Punishment.create({
        userId: user.id,
        modId: interaction.user.id,
        guildId: interaction.guild.id,
        type: "KICK",
        active: true,
        deleted: false,
        reason: reason
      });
    } catch(e) {
      error = true;
      if(!e.errors) {
        interactionEmbed(3, "[ERR-SQL]", "An unknown error occured while adding the kick to the database", interaction, client, [true, 10]);
      } else {
        interactionEmbed(3, "[ERR-SQL]", `> ${e.errors.map(e => `\`${e.type}\` @ \`${e.path}\``).join("\n> ")}`, interaction, client, [true, 15]);
      }
    }
    if(error) return;

    interactionEmbed(1, `Kicked ${user} for: ${reason}`, interaction, client, [false, 0]);
  }
};
const { SlashCommandBuilder } = require("@discordjs/builders");
// eslint-disable-next-line no-unused-vars
const { Client, CommandInteraction, CommandInteractionOptionResolver } = require("discord.js");
const { interactionEmbed } = require("../functions");
const config = require("../config.json");

module.exports = {
  name: "pardon",
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("pardon")
    .setDescription("Pardon a user from a punishment (You must have the case ID for this)")
    .addIntegerOption(option => {
      return option
        .setName("case_id")
        .setDescription("The case ID of the punishment to remove")
        .setMinValue(1)
        .setRequired(true);
    })
    .addStringOption(option => {
      return option
        .setName("reason")
        .setDescription("The reason for the removal")
        .setRequired(false);
    }),
  /**
   * @param {Client} client
   * @param {CommandInteraction} interaction
   * @param {CommandInteractionOptionResolver} options
   */
  run: async (client, interaction, options) => {
    const caseId = options.getInteger("case_id");
    const reason = options.getString("reason") ?? "No reason provided";
    let error = false;

    // Check if the case exists
    const punishment = await client.models.Punishment.findOne({ where: { caseId: caseId } });
    if(!punishment) return interactionEmbed(3, "[ERR-MISS]", `Case \`${caseId}\` does not exist`, interaction, client, [true, 10]);
    if(punishment.deleted) return interactionEmbed(3, "[ERR-ARGS]", `Case \`${caseId}\` has already been deleted`, interaction, client, [true, 10]);

    // Validation
    if(punishment.userId === interaction.user.id) return interactionEmbed(3, "[ERR-ARGS]", "You cannot pardon yourself", interaction, client, [true, 10]);
    if(!interaction.member.permissions.has("MANAGE_ROLES") && !interaction.member.roles.has(config.discord.devRole)) return interactionEmbed(3, "[ERR-UPRM]", "You do not have permission to warn members", interaction, client, [true, 10]);

    // Remove the punishment
    try {
      await client.models.Punishment.update({ deleted: true }, { where: { caseId: caseId } });
    } catch(e) {
      error = true;
      if(!e.errors) {
        interactionEmbed(3, "[ERR-SQL]", "An unknown error occured while adding the warning to the database", interaction, client, [true, 10]);
      } else {
        interactionEmbed(3, "[ERR-SQL]", `> ${e.errors.map(e => `\`${e.type}\` @ \`${e.path}\``).join("\n> ")}`, interaction, client, [true, 15]);
      }
    }
    if(error) return;

    // eslint-disable-next-line no-useless-escape
    interaction.editReply({ content: "\:clock1: Removed case from the database. Reverting any actions taken" });

    // Undo any actions taken
    if(punishment.type === "BAN") {
      interaction.guild.bans.remove(punishment.userId, reason)
        .then((u) => {
          interactionEmbed(1, `Removed case \`${caseId}\` from the database. Reverted ban of \`${u.tag}\` (\`${u.id}\`)`, interaction, client, [true, 10]);
        }, (e) => {
          interactionEmbed(3, "[ERR-UNK]", `An unknown error occured while removing the ban from the server: ${e.message}`, interaction, client, [true, 10]);
        });
    } else if(punishment.type === "MUTE") {
      interaction.guild.members.fetch(punishment.userId)
        .then((u) => {
          u.timeout(null, reason + ` (Moderator ID: ${interaction.user.id})`);
          interactionEmbed(1, `Removed case \`${caseId}\` from the database. Reverted mute of \`${u.tag}\` (\`${u.id}\`)`, interaction, client, [true, 10]);
        }, (e) => {
          interactionEmbed(3, "[ERR-UNK]", `An unknown error occured while removing the mute from the server: ${e.message}`, interaction, client, [true, 10]);
        });
    } else {
      interactionEmbed(1, `Removed case \`${caseId}\` from the database`, interaction, client, [true, 10]);
    }
  }
};
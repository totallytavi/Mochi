// eslint-disable-next-line no-unused-vars
import { Client, CommandInteraction, CommandInteractionOptionResolver, SlashCommandBuilder } from "discord.js";
import { interactionEmbed } from "../functions.js";
import { discord } from "../config.json";

export const name = "pardon";
export const ephemeral = false;
export const data = new SlashCommandBuilder()
  .setName("pardon")
  .setDescription("Removes a punishment (Case ID is needed)")
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
  });
export async function run(client, interaction, options) {
  const caseId = options.getInteger("case_id");
  const reason = options.getString("reason") ?? "No reason specified";
  let error = false;

  // Check if the case exists
  const punishment = await client.models.Punishment.findOne({ where: { caseId: caseId } });
  if (!punishment) return interactionEmbed(3, "[ERR-MISS]", `Case \`${caseId}\` does not exist`, interaction, client, [true, 10]);
  if (punishment.deleted) return interactionEmbed(3, "[ERR-ARGS]", `Case \`${caseId}\` has already been deleted`, interaction, client, [true, 10]);

  // Validation
  if (punishment.userId === interaction.user.id) return interactionEmbed(3, "[ERR-ARGS]", "You cannot pardon yourself", interaction, client, [true, 10]);
  if (!interaction.member.permissions.has("MANAGE_ROLES") && !interaction.member.roles.has(discord.devRole)) return interactionEmbed(3, "[ERR-UPRM]", "You do not have permission to warn members", interaction, client, [true, 10]);

  // Remove the punishment
  try {
    await client.models.Punishment.update({ revertReason: reason, deleted: true }, { where: { caseId: caseId } });
  } catch (e) {
    error = true;
    if (!e.errors) {
      interactionEmbed(3, "[ERR-SQL]", "An unknown error occured while adding the warning to the database", interaction, client, [true, 10]);
    } else {
      interactionEmbed(3, "[ERR-SQL]", `> ${e.errors.map(e => `\`${e.type}\` @ \`${e.path}\``).join("\n> ")}`, interaction, client, [true, 15]);
    }
  }
  if (error) return;

  // eslint-disable-next-line no-useless-escape
  interaction.editReply({ content: "\:clock1: Removed case from the database. Reverting any actions taken" });

  // Undo any actions taken
  if (punishment.type === "BAN") {
    interaction.guild.bans.remove(punishment.userId, reason)
      .then((u) => {
        interactionEmbed(1, `Removed case \`${caseId}\` from the database. Reverted ban of \`${u.tag}\` (\`${u.id}\`)`, "", interaction, client, [true, 10]);
      }, (e) => {
        interactionEmbed(3, "[ERR-UNK]", `An unknown error occured while removing the ban from the server: ${e.message}`, interaction, client, [true, 10]);
      });
  } else if (punishment.type === "MUTE") {
    interaction.guild.members.fetch(punishment.userId)
      .then((u) => {
        u.timeout(null, reason + ` (Moderator ID: ${interaction.user.id})`);
        interactionEmbed(1, `Removed case \`${caseId}\` from the database. Reverted mute of \`${u.tag}\` (\`${u.id}\`)`, "", interaction, client, [true, 10]);
      }, (e) => {
        interactionEmbed(3, "[ERR-UNK]", `An unknown error occured while removing the mute from the server: ${e.message}`, interaction, client, [true, 10]);
      });
  } else {
    interactionEmbed(1, `Removed case \`${caseId}\` from the database`, "", interaction, client, [true, 10]);
  }
}
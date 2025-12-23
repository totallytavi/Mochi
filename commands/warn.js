// eslint-disable-next-line no-unused-vars
import { SlashCommandBuilder } from "discord.js";
import { default as _config } from "../config.json" with { "type": "json" };
const { discord } = _config;
import { interactionEmbed } from "../functions.js";

export const name = "warn";
export const ephemeral = false;
export const data = new SlashCommandBuilder()
  .setName("warn")
  .setDescription("Warns a user")
  .addUserOption(option => {
    return option
      .setName("user")
      .setDescription("The user to warn")
      .setRequired(true);
  })
  .addStringOption(option => {
    return option
      .setName("reason")
      .setDescription("The reason for the warn")
      .setRequired(true);
  });
export async function run(client, interaction, options) {
  const user = options.getMember("user");
  const reason = options.getString("reason") ?? "No reason specified";
  let error = false;

  //#region Validation
  // Check if the user exists
  if (!user) return interactionEmbed(3, "[ERR-ARGS]", "That user does not exist in this server (Check your mutuals with them)", interaction, client, [true, 10]);
  // Check executions
  if (user === interaction.member) return interactionEmbed(3, "[ERR-ARGS]", "You cannot warn yourself", interaction, client, [true, 10]);
  if (user.user.bot) return interactionEmbed(3, "[ERR-ARGS]", "Bots cannot be warned", interaction, client, [true, 10]);
  // Executor permissions
  if (!interaction.member.permissions.has("MANAGE_ROLES") && !interaction.member.roles.has(discord.devRole)) return interactionEmbed(3, "[ERR-UPRM]", "You do not have permission to warn members", interaction, client, [true, 10]);
  if (interaction.member.roles.highest.comparePositionTo(user.roles.highest) <= 0) return interactionEmbed(3, "[ERR-UPRM]", "You cannot warn someone equal to or higher than you on the role hierarchy", interaction, client, [true, 10]);
  // Executed permissions
  if (!user.permissions.has("MANAGE_ROLES")) return interactionEmbed(3, "[ERR-UPRM]", "You cannot warn a staff member", interaction, client, [true, 10]);
  //#endregion
  // Warn the user
  await interaction.editReply({ content: "Adding the warn to the database" });
  user.send(`You have been warned from ${interaction.guild.name} for: ${reason}`).catch(() => { return; });
  try {
    await client.models.Punishment.create({
      userId: user.id,
      modId: interaction.user.id,
      type: "WARN",
      active: true,
      deleted: false,
      reason: reason
    });
  } catch (e) {
    error = true;
    if (!e.errors) {
      interactionEmbed(3, "[ERR-SQL]", "An unknown error occured while adding the warn to the database", interaction, client, [true, 10]);
    } else {
      interactionEmbed(3, "[ERR-SQL]", `> ${e.errors.map(e => `\`${e.type}\` @ \`${e.path}\``).join("\n> ")}`, interaction, client, [true, 15]);
    }
  }
  if (error) return;

  interactionEmbed(1, `Warned ${user} for: ${reason}`, interaction, client, [false, 0]);
}
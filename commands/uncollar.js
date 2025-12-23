// eslint-disable-next-line no-unused-vars
import { Client, CommandInteraction, CommandInteractionOptionResolver, ButtonBuilder, SlashCommandBuilder } from "discord.js";
import { interactionEmbed, awaitButtons } from "../functions.js";

export const name = "uncollar";
export const ephemeral = false;
export const data = new SlashCommandBuilder()
  .setName("uncollar")
  .setDescription("Unclaims a user by removing the collar")
  .addUserOption(option => {
    return option
      .setName("user")
      .setDescription("The user to remove the collar from")
      .setRequired(true);
  })
  .addBooleanOption(option => {
    return option
      .setName("all_servers")
      .setDescription("Target the user-level collar?")
      .setRequired(false);
  });
export async function run(client, interaction, options) {
  let error = false;
  const guildId = options.getBoolean("all_servers") ? "0" : interaction.guild.id;

  // Check the user exists on the server
  const discMember = options.getMember("user");
  if (!discMember) return interactionEmbed(3, "[ERR-ARGS]", "That user does not exist in this server (Check your mutuals with them)", interaction, client, [true, 10]);

  // Make sure the user is not already collared with that user
  const check = await client.models.Collar.findOne({ where: { collared: discMember.user.id, guild: guildId } });
  if (check === null) return interactionEmbed(3, "[ERR-ARGS]", "That user isn't collared by anyone", interaction, client, [true, 10]);
  if (check.owner !== interaction.user.id && check.collared !== interaction.user.id) return interactionEmbed(3, "[ERR-ARGS]", "You can only uncollar yourself or those you've collared", interaction, client, [true, 10]);

  // Confirmation
  const confirmation = await awaitButtons(interaction, 15, [new ButtonBuilder({ customId: "yes", label: "Yes", style: 4 }), new ButtonBuilder({ customId: "no", label: "No", style: 1 })], `Are you sure you want to uncollar ${check.owner === interaction.user.id ? "your pet" : "yourself"}?`, false);
  if (confirmation != null) await confirmation.deleteReply();
  if (confirmation === null || confirmation.customId === "no") {
    return interactionEmbed(4, "", "Cancelled the command", interaction, client, [true, 10]);
  }

  // Remove the collar
  try {
    await client.models.Collar.destroy({ where: { collared: discMember.user.id } });
  } catch (e) {
    error = true;
    if (!e.errors) {
      await interaction.editReply({ content: `\`❌\` An unknown error occurred while removing the collar: \`${e.message}\`` });
    } else {
      await interaction.editReply({ content: `\`❌\` Errors occured while removing the collar in the database:\n> ${e.errors.map(e => `\`${e.type}\` @ \`${e.path}\``).join("\n> ")}` });
    }
  }

  if (error) return;

  interactionEmbed(1, "", "Successfully uncollared the user", interaction, client, [false, 0]);
}
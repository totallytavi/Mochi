// eslint-disable-next-line no-unused-vars
import { ButtonBuilder, SlashCommandBuilder } from "discord.js";
import { awaitButtons, interactionEmbed } from "../functions.js";

export const name = "muffle";
export const ephemeral = false;
export const data = new SlashCommandBuilder()
  .setName("muffle")
  .setDescription("Alters a user's collar to muffle their speech")
  .addUserOption(option => {
    return option
      .setName("user")
      .setDescription("The user to collar")
      .setRequired(true);
  })
  .addStringOption(option => {
    return option
      .setName("collar_type")
      .setDescription("The type of collar to apply")
      .setRequired(true)
      .addChoices(
        { name: "Standard", value: "standard" },
        { name: "Puppy", value: "dog" },
        { name: "Kitty", value: "cat" }
      )
  });
export async function run(client, interaction, options) {
  let error = false;
  const guildId = options.getBoolean("all_servers") ? "0" : interaction.guild.id;
  const collarType = options.getString("collar_type", true);

  // Check the user exists on the server
  const discMember = options.getMember("user");
  if (!discMember) return interactionEmbed(3, "[ERR-ARGS]", "That user does not exist in this server (Check your mutuals with them)", interaction, client, [true, 10]);

  // Make sure the user is not already collared with that user
  const check = await client.models.Collar.findOne({ where: { collared: discMember.user.id, guild: guildId } });
  if (check === null) return interactionEmbed(3, "[ERR-ARGS]", "Couldn't find a collar on you/them (This only works on server-level collars!)", interaction, client, [true, 10]);
  if (check.owner !== interaction.user.id && check.collared !== interaction.user.id) return interactionEmbed(3, "[ERR-ARGS]", "You can manage your own and pets' collar type", interaction, client, [true, 10]);

  // Confirmation
  const confirmation = await awaitButtons(interaction, 15, [new ButtonBuilder({ customId: "yes", label: "Yes", style: 4 }), new ButtonBuilder({ customId: "no", label: "No", style: 1 })], `Are you sure you want to alter ${check.owner === interaction.user.id ? "your pet's" : "your"} muffle?`, false);
  if (confirmation != null) await confirmation.deleteReply();
  if (confirmation === null || confirmation.customId === "no") {
    return interactionEmbed(4, "", "Cancelled the command", interaction, client, [true, 10]);
  }

  // Alter the collar
  try {
    await client.models.Collar.update(
      { collarType },
      {
        where: { collared: discMember.user.id }
      }
    );
  } catch (e) {
    error = true;
    if (!e.errors) {
      await interaction.editReply({ content: `\`❌\` An unknown error occurred while altering the collar: \`${e.message}\`` });
    } else {
      await interaction.editReply({ content: `\`❌\` Errors occured while altering the collar in the database:\n> ${e.errors.map(e => `\`${e.type}\` @ \`${e.path}\``).join("\n> ")}` });
    }
  }

  if (error) return;

  discMember.user.send(`\`🔇\` Your collar's muffle type has been altered to **${collarType}** in **${interaction.guild.name}** by ${interaction.user.toString()}. Put \`\\\` at the beginning of your message to turn it off for that message only!`).catch(() => { });
  interactionEmbed(1, "", "Successfully altered the user's muffle type", interaction, client, [false, 0]);
}
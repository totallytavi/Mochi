const { SlashCommandBuilder } = require("@discordjs/builders");
// eslint-disable-next-line no-unused-vars
const { Client, CommandInteraction, CommandInteractionOptionResolver, MessageButton } = require("discord.js");
const { interactionEmbed, awaitButtons } = require("../functions.js");

module.exports = {
  name: "uncollar",
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("uncollar")
    .setDescription("Uncalims a user by removing the collar")
    .addUserOption(option => {
      return option 
        .setName("user")
        .setDescription("The user to remove the collar from")
        .setRequired(true);
    }),
  /**
   * @param {Client} client
   * @param {CommandInteraction} interaction
   * @param {CommandInteractionOptionResolver} options
   */
  run: async (client, interaction, options) => {
    let error = false;

    // Check the user exists on the server
    const discMember = options.getMember("user");
    if(!discMember) return interactionEmbed(3, "[ERR-ARGS]", "That user does not exist in this server (Check your mutuals with them)", interaction, client, [true, 10]);

    // Make sure the user is not already collared with that user
    const check = await client.models.Collar.findOne({ where: { collared: discMember.user.id, owner: interaction.user.id } });
    if(check === null) return interactionEmbed(3, "[ERR-ARGS]", "That user isn't collared by you", interaction, client, [true, 10]);

    // Confirmation
    const confirmation = await awaitButtons(interaction, 15, [new MessageButton({ customId: "yes", label: "Yes", style: "DANGER" }), new MessageButton({ customId: "no", label: "No", style: "PRIMARY" })], "Are you sure you wish to uncollar that user?", [true, 10]);
    await confirmation.deleteReply();
    if(confirmation === null || confirmation.customId === "no") {
      return interactionEmbed(4, "Cancelled the command", "", interaction, client, [true, 10]);
    }

    // Remove the collar
    try {
      await client.models.Collar.delete({ where: { collared: discMember.user.id } });
    } catch(e) {
      error = true;
      if(!e.errors) {
        await interaction.editReply({ content: `\`❌\` An unknown error occurred while removing the collar: \`${e.message}\`` });
      } else {
        await interaction.editReply({ content: `\`❌\` Errors occured while removing the collar in the database:\n> ${e.errors.map(e => `\`${e.type}\` @ \`${e.path}\``).join("\n> ")}` });
      }
    }

    if(error) return;

    interactionEmbed(1, "Successfully uncollared the user", "", interaction, client, [false, 0]);
  }
};
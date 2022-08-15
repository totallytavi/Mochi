// eslint-disable-next-line no-unused-vars
const { Client, CommandInteraction, CommandInteractionOptionResolver, SlashCommandBuilder } = require("discord.js");
const { interactionEmbed } = require("../functions.js");

module.exports = {
  name: "collar",
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("collar")
    .setDescription("Claims a user by collaring them")
    .addUserOption(option => {
      return option 
        .setName("user")
        .setDescription("The user to collar")
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
    if(discMember.user.id === interaction.user.id) return interactionEmbed(3, "[ERR-ARGS]", "You cannot collar yourself", interaction, client, [true, 10]);
    if(!discMember) return interactionEmbed(3, "[ERR-ARGS]", "That user does not exist in this server (Check your mutuals with them)", interaction, client, [true, 10]);

    // Ensure the user is not already collared and they are not trying to 
    const check = await client.models.Collar.findOne({ where: { collared: discMember.user.id } });
    if(check != null) return interactionEmbed(3, "[ERR-ARGS]", "That user is already collared", interaction, client, [true, 10]);
    const ownerCheck = await client.models.Collar.findOne({ where: { collared: interaction.member.id, owner: discMember.user.id } });
    if(ownerCheck != null) return interactionEmbed(3, "[ERR-ARGS]", "You cannot collar your owner!", interaction, client, [true, 10]);

    // Create a collar
    try {
      await client.models.Collar.create({
        collared: discMember.user.id,
        owner: interaction.user.id,
        guild: interaction.guild.id,
        collaredAt: new Date()
      });
    } catch(e) {
      error = true;
      if(!e.errors) {
        await interaction.editReply({ content: `\`❌\` An unknown error occurred while registering the collar: \`${e.message}\`` });
      } else {
        await interaction.editReply({ content: `\`❌\` Errors occured while registering the collar in the database:\n> ${e.errors.map(e => `\`${e.type}\` @ \`${e.path}\``).join("\n> ")}` });
      }
    }

    if(error) return;

    interactionEmbed(1, "", "Successfully collared the user", interaction, client, [false, 0]);
  }
};
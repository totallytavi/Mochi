// eslint-disable-next-line no-unused-vars
const { Client, CommandInteraction, CommandInteractionOptionResolver, SlashCommandBuilder, Team } = require("discord.js");
const { interactionEmbed } = require("../functions");

module.exports = {
  name: "eval",
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("eval")
    .setDescription("Evaluates a JavaScript expression")
    .addStringOption(option => {
      return option
        .setName("expression")
        .setDescription("The expression to evaluate")
        .setRequired(true);
    }),
  /**
   * @param {Client} client
   * @param {CommandInteraction} interaction
   * @param {CommandInteractionOptionResolver} options
   */
  run: async (client, interaction, options) => {
    await client.application.fetch(); // Get the application
    if(client.application.owner instanceof Team) {
      if(!client.application.owner.members.some(m => m.id === interaction.user.id)) return interactionEmbed(3, "[ERR-UPRM]", "You are not authorised to run this command", interaction, client, [true, 10]);
    } else {
      if(client.application.owner.id != interaction.user.id) return interactionEmbed(3, "[ERR-UPRM]", "You are not authorised to run this command", interaction, client, [true, 10]);
    }

    const then = Date.now();
    await require("node:util").promisify(setTimeout)(1000); // Prevent instant eval (0-1ms, etc.)
    try {
      const result = await eval(options.getString("expression"));
      const str = JSON.stringify(result);
      // Split the string into chunks of 2000 characters
      const chunks = str.match(/.{1,1900}/gs);
      for(const chunk of chunks) {
        await interaction.followUp({ content: `\`\`\`js\n${chunk}\n\`\`\`` });
        if(chunks.indexOf(chunk) === chunks.length - 1) await interaction.followUp({ content: `Execution time: ${Date.now() - then}ms` })
          .then(m => m.react("825893086043439144"));
      }
    } catch(e) {
      const error = e.stack;
      // Split the string into chunks of 2000 characters
      const chunks = error.match(/.{1,1900}/gs);
      for(const chunk of chunks) {
        await interaction.followUp({ content: `\`\`\`js\n${chunk}\n\`\`\`` });
        if(chunks.indexOf(chunk) === chunks.length - 1) await interaction.followUp({ content: `Execution time: ${Date.now() - then}ms` })
          .then(m => m.react("825893085267361813"));
      }
    }
  }
};
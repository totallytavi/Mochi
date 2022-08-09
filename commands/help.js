// eslint-disable-next-line no-unused-vars
const { Client, CommandInteraction, CommandInteractionOptionResolver, SlashCommandBuilder } = require("discord.js");
const { pages, interactionEmbed } = require("../functions.js");

module.exports = {
  name: "help",
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows the help panel")
    .addStringOption(option => {
      return option
        .setName("command")
        .setDescription("The command to get help for")
        .setRequired(false);
    }),
  /**
   * @param {Client} client
   * @param {CommandInteraction} interaction
   * @param {CommandInteractionOptionResolver} options
   */
  run: async (client, interaction, options) => {
    if(!options.getString("command")) {
      interaction.followUp({ embeds: [pages[0]], content: "The help pages have been shown below!" })
        .then(m => {
          m.react("⏮️");
          m.react("⏹️");
          m.react("⏭️");
        });
    } else {
      const command = client.commands.get(options.getString("command"));
      if(!command) {
        return interactionEmbed(3, "[ERR-ARGS]", "The command you specified does not exist!", interaction, client, [true, 10]);
      }
      let pageEmbed;
      for(const embed of pages) {
        if(embed.fields.some(field => field.name === command.name)) {
          pageEmbed = embed;
          break;
        }
      }
      // Splice the field that contains the command name
      const field = pageEmbed.fields.find(field => field.name === command.name);
      pageEmbed.fields.splice(0, pageEmbed.fields.length, field);
      return interaction.editReply({ embeds: [pageEmbed] })
        .then(m => setTimeout(() => { m.delete(); }, 30_000));
    }
  }
};
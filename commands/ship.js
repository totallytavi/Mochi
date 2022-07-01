const { SlashCommandBuilder } = require("@discordjs/builders");
// eslint-disable-next-line no-unused-vars
const { Client, CommandInteraction, CommandInteractionOptionResolver, MessageEmbed } = require("discord.js");

module.exports = {
  name: "ship",
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("ship")
    .setDescription("Ship yourself, yourself and a random user, or two users")
    .addStringOption(option => {
      return option
        .setName("user")
        .setDescription("The user to ship with")
        .setRequired(false);
    })
    .addStringOption(option => {
      return option
        .setName("user2")
        .setDescription("The user to ship with")
        .setRequired(false);
    }),
  /**
   * @param {Client} client
   * @param {CommandInteraction} interaction
   * @param {CommandInteractionOptionResolver} options
   */
  run: async (_client, interaction, options) => {
    // User handling
    const member = options.getString("user");
    const member2 = options.getString("user2");
    let user1, user2, emoji;
    const cache = await interaction.guild.members.fetch().then(m => { return m.filter(m => !m.user.bot && m.user.id != interaction.user.id); });
    const regex = /<@![0-9]+>/g;
    // If both are empty
    if(isNull(member) && isNull(member2)) {
      user1 = interaction.user.toString();
      user2 = cache.random().toString();
      // If member is a string or mention
    } else if(regex.test(member) && !isNull(member)) {
      user1 = member.match(regex)[0];
      user2 = cache.random().toString();
      // If member2 is a string or mention
    } else if(regex.test(member2) && !isNull(member2)) {
      user1 = cache.random().toString();
      user2 = member2.match(regex)[0];
      // If member is a string
    } else if(!isNull(member) && isNull(member2)) {
      user1 = member;
      user2 = cache.random().toString();
      // If member2 is a string
    } else if(isNull(member) && !isNull(member2)) {
      user1 = cache.random().toString();
      user2 = member2;
    }

    // Emoji handling
    const min = 0;
    const max = 100;
    const match = Math.floor(Math.random()*(max-min+1)+min);

    // Start the hell of matching an emoji
    if(match >= 0 && match <= 10) {
      emoji = "🤍🖤🖤🖤🖤🖤🖤🖤🖤🖤";
    } else if(match >= 11 && match <= 20) {
      emoji = "🤍🤍🖤🖤🖤🖤🖤🖤🖤🖤";
    } else if(match >= 21 && match <= 30) {
      emoji = "🤍🤍💜🖤🖤🖤🖤🖤🖤🖤";
    } else if(match >= 31 && match <= 40) {
      emoji = "🤍🤍💜💜🖤🖤🖤🖤🖤🖤";
    } else if(match >= 41 && match <= 50) {
      emoji = "🤍🤍💜💜💙🖤🖤🖤🖤🖤";
    } else if(match >= 51 && match <= 60) {
      emoji = "🤍🤍💜💜💙💚🖤🖤🖤🖤";
    } else if(match >= 61 && match <= 70) {
      emoji = "🤍🤍💜💜💙💚🖤🖤🖤";
    } else if(match >= 71 && match <= 80) {
      emoji = "🤍🤍💜💜💙💚💛🖤🖤";
    } else if(match >= 81 && match <= 90) {
      emoji = "🤍🤍💜💜💙💚💛🧡❤️🖤";
    } else if(match >= 91 && match <= 100) {
      emoji = "🤍🤍💜💜💙💚💛🧡❤️❤️";
    }
    
    interaction.editReply({ embeds: [new MessageEmbed({
      color: Math.floor(Math.random()*16777215),
      description: `**${user1} x ${user2}**
      
      ${emoji} : ${match}%`
    })] });
  }
};

function isNull(obj) {
  return obj === null;
}
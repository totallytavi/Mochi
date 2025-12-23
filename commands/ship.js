// eslint-disable-next-line no-unused-vars
import { Client, CommandInteraction, CommandInteractionOptionResolver, Embed, SlashCommandBuilder } from "discord.js";

export const name = "ship";
export const ephemeral = false;
export const data = new SlashCommandBuilder()
  .setName("ship")
  .setDescription("Ship two people or two random people in the server!")
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
  });
export async function run(_client, interaction, options) {
  // User handling
  let emoji;
  const cache = await interaction.guild.members.fetch().then(m => { return m.filter(m => !m.user.bot && m.user.id != interaction.user.id); });
  // If both are empty
  const user1 = options.getString("user") ?? cache.random();
  const user2 = options.getString("user2") ?? cache.random();

  // Emoji handling
  const min = 0;
  const max = 100;
  const match = Math.floor(Math.random() * (max - min + 1) + min);

  // Start the hell of matching an emoji
  if (match >= 0 && match <= 10) {
    emoji = "🤍🖤🖤🖤🖤🖤🖤🖤🖤🖤";
  } else if (match >= 11 && match <= 20) {
    emoji = "🤍🤍🖤🖤🖤🖤🖤🖤🖤🖤";
  } else if (match >= 21 && match <= 30) {
    emoji = "🤍🤍💜🖤🖤🖤🖤🖤🖤🖤";
  } else if (match >= 31 && match <= 40) {
    emoji = "🤍🤍💜💜🖤🖤🖤🖤🖤🖤";
  } else if (match >= 41 && match <= 50) {
    emoji = "🤍🤍💜💜💙🖤🖤🖤🖤🖤";
  } else if (match >= 51 && match <= 60) {
    emoji = "🤍🤍💜💜💙💚🖤🖤🖤🖤";
  } else if (match >= 61 && match <= 70) {
    emoji = "🤍🤍💜💜💙💚🖤🖤🖤";
  } else if (match >= 71 && match <= 80) {
    emoji = "🤍🤍💜💜💙💚💛🖤🖤";
  } else if (match >= 81 && match <= 90) {
    emoji = "🤍🤍💜💜💙💚💛🧡❤️🖤";
  } else if (match >= 91 && match <= 100) {
    emoji = "🤍🤍💜💜💙💚💛🧡❤️❤️";
  }

  interaction.editReply({
    embeds: [new Embed({
      color: Math.floor(Math.random() * 16777215),
      description: `**${user1} x ${user2}**
      
      ${emoji} : ${match}%`
    })]
  });
}
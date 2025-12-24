// eslint-disable-next-line no-unused-vars
import { Embed, SlashCommandBuilder } from "discord.js";
import { toConsole } from "../functions.js";

export const name = "debug";
export const ephemeral = false;
export const data = new SlashCommandBuilder()
  .setName("debug")
  .setDescription("Shows information about the bot for support purposes");
export async function run(client, interaction, _options) {
  // Get the server settings
  const settings = await client.models.Setting.findOne({ where: { guildId: interaction.guild.id } });

  interaction.editReply({
    content: "Information has been provided below! Please forward this to support if they do not see it", embeds: [new Embed({
      title: "Debugging Information",
      description: "This information is provided for support purposes only and should not be shared with anyone else apart from support",
      fields: [
        { name: "Guild ID", value: interaction.guild.id, inline: true },
        { name: "Guild Name", value: interaction.guild.name, inline: true },
        { name: "Guild Owner", value: interaction.guild.ownerId, inline: true },
        { name: "Executor Permissions", value: interaction.memberPermissions.bitfield.toString(), inline: true },
        { name: "Settings in Database?", value: settings.introChannel === " " ? "No" : "Yes", inline: true },
        { name: "Auto Verification?", value: settings.autoVerify ? "Yes" : "No", inline: true },
      ],
      footer: {
        text: `${interaction.guild.memberCount} members :=: ${interaction.guild.members.cache.size} cached`
      }
    })]
  });

  return toConsole(`Debugging information has been provided for ${interaction.guild.name} (${interaction.guild.id})\n> Guild ID: ${interaction.guild.id}\n> Guild Name: ${interaction.guild.name}\n> Guild Owner: ${(await interaction.guild.members.fetch(interaction.guild.ownerId)).user.tag} (${(await interaction.guild.members.fetch(interaction.guild.ownerId)).user.id})\n> Guild Member Count: ${interaction.guild.memberCount} (Cache: ${interaction.guild.members.cache.size})\n> Executor Permissions: ${interaction.memberPermissions.bitfield.toString()}\n> Settings in Database?: ${settings.introChannel === " " ? "No" : "Yes"}`, new Error().stack, client);
}
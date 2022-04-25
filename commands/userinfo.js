const { SlashCommandBuilder } = require("@discordjs/builders");
// eslint-disable-next-line no-unused-vars
const { Client, CommandInteraction, CommandInteractionOptionResolver, MessageEmbed } = require("discord.js");
const { interactionEmbed } = require("../functions");
// Moment isn't technically needed. It's required because Date constructors convert dates to your local timezone.
const moment = require("moment");
const config = require("../config.json");

module.exports = {
  name: "userinfo",
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("userinfo")
    .setDescription("Gets information about a user")
    .addUserOption(option => {
      return option
        .setName("user")
        .setDescription("The user to get information about")
        .setRequired(true);
    })
    .addBooleanOption(option => {
      return option
        .setName("mod_history")
        .setDescription("Whether or not to include the mod history of the user")
        .setRequired(false);
    }),
  /**
   * @param {Client} client
   * @param {CommandInteraction} interaction
   * @param {CommandInteractionOptionResolver} options
   */
  run: async (client, interaction, options) => {
    // Make sure the user exists and is in the server
    const member = options.getMember("user");
    if(!member) return interactionEmbed(3, "[ERR-ARGS]", "That user does not exist in this server (Check your mutuals with them)", interaction, client, [true, 10]);

    const embed = new MessageEmbed({
      color: Math.floor(Math.random() * 16777215)
    });
    embed.setTitle(`Information on ${member.user.tag}`);
    embed.setDescription(`User ID: ${member.user.id}`);
    embed.setThumbnail(member.user.displayAvatarURL({ format: "png", size: 2048, dynamic: true }));
    embed.addFields([
      { name: "Register Date", value: String(moment(member.user.createdAt)._i), inline: true },
      { name: "Join Date", value: String(moment(member.joinedAt)._i), inline: true },
      { name: "Nickname", value: `${member.nickname || "None"}`, inline: true },
      { name: "Roles", value: `${member.roles.cache.sort((a, b) => b.position - a.position).filter(r => r != member.guild.roles.everyone).map(r => r.toString()).join(", ") || "None"}`, inline: false },
    ]);

    interaction.editReply({ embeds: [embed] });
    await require("util").promisify(setTimeout)(5e2);

    if(options.getBoolean("mod_history")) {
      let punishments = await client.models.Punishment.findAll({ where: { guildId: interaction.guild.id, userId: member.user.id, deleted: false } });
      if(member.roles.cache.has(config.discord.devRole)) punishments = await client.models.Punishment.findAll({ where: { userId: member.user.id } });
      const embed2 = new MessageEmbed();
      if(punishments.length > 0) {
        embed2.setTitle(`Information on ${member.user.tag} (${member.user.id})`);
        embed2.setColor(punishments.length < 5 ? 0xFFA500 : 0xFF0000);
        punishments.forEach(async (punishment, index) => {
          // eslint-disable-next-line no-useless-escape
          embed2.addFields({ name: `Punishment ${index + 1} (Case #${punishment.caseId})`, value: `${member.roles.cache.has(config.discord.devRole) ? punishment.deleted ? "`❌`" : "" : ""} ${punishment.type.charAt(0) + punishment.type.slice(1).toLowerCase()} on <t:${new Date(punishment.createdAt).getTime()/1000}> (${punishment.active ? "Active" : "Inactive"})`, inline: true });
        });
      } else {
        embed2.setColor(0x00FF00);
        embed2.setDescription(`${member.user.tag} has no punishments`);
        embed2.setFooter({ text: `ID: ${member.user.id}` });
      }
      await require("util").promisify(setTimeout)(15e2);
      // Since moderation history may be sensitive, make sure it's ephemeral
      interaction.followUp({ embeds: [embed2], ephemeral: true });
    }
  }
};
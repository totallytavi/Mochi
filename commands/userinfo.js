// eslint-disable-next-line no-unused-vars
import { EmbedBuilder, SlashCommandBuilder } from "discord.js";
import moment from "moment";
import { Op } from "sequelize";
import { default as _config } from "../config.json" with { "type": "json" };
const { discord } = _config;
import { interactionEmbed } from "../functions.js";
const timeout = await import("node:util").then((u) => u.promisify(setTimeout));

function collarToString(kind, collar) {
  if (!collar) {
    return `**${kind}**: This user is uncollared!`
  }

  return [
    `**${kind}**:`,
    "<:PinkCollar:968663386881687572>",
    `Owned by <@${collar.owner}>`,
    `since <t:${Math.floor(new Date(collar.collaredAt).getTime()/1000.0)}>`
  ].join(' ')
}

export const name = "userinfo";
export const ephemeral = false;
export const data = new SlashCommandBuilder()
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
  });
export async function run(client, interaction, options) {
  // Make sure the user exists and is in the server
  const member = options.getMember("user");
  if (!member) return interactionEmbed(3, "[ERR-ARGS]", "That user does not exist in this server (Check your mutuals with them)", interaction, client, [true, 10]);

  const embed = new EmbedBuilder({
    color: Math.floor(Math.random() * 16777215)
  });
  const roles = member.roles.cache.sort((a, b) => b.position - a.position).filter(r => r != member.guild.roles.everyone);

  const collars = await client.models.Collar.findAll({ where: { collared: member.user.id, guild: { [Op.or]: [interaction.guild.id, "0"] } } });
  const globalCollar = collarToString('Globally', collars.filter((c) => c.guild === "0")[0]);
  const serverCollar = collarToString('In This Server', collars.filter((c) => c.guild === interaction.guild.id)[0]);

  const pets = await client.models.Collar.findAll({ where: { owner: member.user.id } })
    .then((collars) => collars.reduce((prev, curr) => {
      // Remove duplicates
      if (!prev.some((c) => c.collared === curr.collared)) {
        prev.push(curr);
      }
      return prev;
    }, []));
  let owned;
  if (pets.length > 0) {
    owned = pets.map(c => `<@${c.collared}>`).join(", ");
  } else {
    owned = "No pets!";
  }
  if (owned.length > 1024) {
    owned = `Owns a ${pets.length} pets! (*So many, it can't be shown here :o*)`;
  }
  embed.setTitle(`Information on ${member.user.tag}`);
  embed.setDescription(globalCollar + '\n' + serverCollar);
  embed.setFooter({ text: `ID: ${member.user.id}` });
  embed.setThumbnail(member.user.displayAvatarURL({ format: "png", size: 2048, dynamic: true }));
  embed.addFields([
    { name: "Register Date", value: String(moment(member.user.createdAt)._i), inline: true },
    { name: "Join Date", value: String(moment(member.joinedAt)._i), inline: true },
    { name: "Nickname", value: `${member.nickname || "None"}`, inline: true },
    { name: "Roles", value: `${roles.length <= 1024 ? roles : "Too many roles!"}`, inline: false },
    { name: "Owns", value: owned, inline: true },
  ]);

  interaction.editReply({ embeds: [embed] });
  await timeout(500);

  if (options.getBoolean("mod_history")) {
    let punishments = await client.models.Punishment.findAll({ where: { guildId: interaction.guild.id, userId: member.user.id, deleted: false } });
    if (member.roles.cache.has(discord.devRole)) punishments = await client.models.Punishment.findAll({ where: { userId: member.user.id } });
    const embed2 = new EmbedBuilder();
    if (punishments.length > 0) {
      embed2.setTitle(`Information on ${member.user.tag} (${member.user.id})`);
      embed2.setColor(punishments.length < 5 ? 16753920 : 16711680);
      punishments.forEach(async (punishment, index) => {
        // eslint-disable-next-line no-useless-escape
        embed2.addFields({ name: `Punishment ${index + 1} (Case #${punishment.caseId})`, value: `${member.roles.cache.has(discord.devRole) ? punishment.deleted ? "`❌`" : "" : ""} ${punishment.type.charAt(0) + punishment.type.slice(1).toLowerCase()} on <t:${new Date(punishment.createdAt).getTime() / 1000}> (${punishment.active ? "Active" : "Inactive"})`, inline: true });
      });
    } else {
      embed2.setColor(65280);
      embed2.setDescription(`${member.user.tag} has no punishments`);
    }
    await timeout(1500);
    // Since moderation history may be sensitive, make sure it's ephemeral
    interaction.followUp({ embeds: [embed2], flags: ['Ephemeral'] });
  }
}
const { Client, Collection, IntentsBitField, InteractionType } = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Sequelize } = require("sequelize");
const { Routes } = require("discord-api-types/v9");
const { interactionEmbed, toConsole } = require("./functions.js");
const config = require("./config.json");
const rest = new REST({ version: 10 }).setToken(config.bot.token);
const fs = require("fs");
const wait = require("util").promisify(setTimeout);
let ready = false;
let cache = [0, {}];

//#region Setup
// Database
const sequelize = new Sequelize(config.mysql.database, config.mysql.user, config.mysql.password, {
  dialect: "mysql",
  logging: process.env.environment === "development" ? console.log : false,
});
if(!fs.existsSync("./models")) {
  console.warn("[DB] No models detected");
} else {
  console.info("[DB] Models detected");
  const models = fs.readdirSync("models").filter(file => file.endsWith(".js"));
  console.info(`[DB] Expecting ${models.length} models`);
  for(const model of models) {
    try {
      const file = require(`./models/${model}`);
      file.import(sequelize);
      console.info(`[DB] Loaded ${model}`);
    } catch(e) {
      console.error(`[DB] Unloaded ${model}`);
      console.error(`[DB] ${e}`);
    }
  }
}

// Discord bot
const client = new Client({
  intents: [IntentsBitField.Flags.Guilds, IntentsBitField.Flags.GuildBans, IntentsBitField.Flags.GuildMembers, IntentsBitField.Flags.GuildMessages],
  sweepers: {
    "messages": {
      lifetime: 10,
      interval: 15
    }
  }
});
const slashCommands = [];
client.commands = new Collection();
client.sequelize = sequelize;
client.models = sequelize.models;

(async () => {
  if(!fs.existsSync("./commands")) return console.info("[FILE-LOAD] No 'commands' folder found, skipping command loading");
  const commands = fs.readdirSync("./commands").filter(file => file.endsWith(".js"));
  console.info(`[FILE-LOAD] Loading files, expecting ${commands.length} files`);

  for(let file of commands) {
    try {
      console.info(`[FILE-LOAD] Loading file ${file}`);
      let command = require(`./commands/${file}`);

      if(command.name) {
        console.info(`[FILE-LOAD] Loaded: ${file}`);
        slashCommands.push(command.data.toJSON());
        client.commands.set(command.name, command);
      }
    } catch(e) {
      console.warn(`[FILE-LOAD] Unloaded: ${file}`);
      console.warn(`[FILE-LOAD] ${e}`);
    }
  }

  console.info("[FILE-LOAD] All files loaded into ASCII and ready to be sent");
  await wait(500); // Artificial wait to prevent instant sending
  const now = Date.now();

  try {
    console.info("[APP-CMD] Started refreshing application (/) commands.");

    // Refresh based on environment
    if(process.env.environment === "development") {
      await rest.put(
        Routes.applicationGuildCommands(config.bot.applicationId, config.bot.guildId),
        { body: slashCommands }
      );
    } else {
      await rest.put(
        Routes.applicationCommands(config.bot.applicationId),
        { body: slashCommands }
      );
    }
    
    const then = Date.now();
    console.info(`[APP-CMD] Successfully reloaded application (/) commands after ${then - now}ms.`);
  } catch(error) {
    console.error("[APP-CMD] An error has occurred while attempting to refresh application commands.");
    console.error(`[APP-CMD] ${error}`);
  }
  console.info("[FILE-LOAD] All files loaded successfully");
  ready = true;
})();
//#endregion

//#region Events
client.on("ready", async () => {
  console.info("[READY] Client is ready");
  console.info(`[READY] Logged in as ${client.user.tag} (${client.user.id}) at ${new Date()}`);
  toConsole(`[READY] Logged in as ${client.user.tag} (${client.user.id}) at <t:${Math.floor(Date.now()/1000)}:T>`, new Error().stack, client);
  // Set the status to new Date();
  client.guilds.cache.each(g => g.members.fetch());
  client.user.setActivity(`${client.users.cache.size} users across ${client.guilds.cache.size} servers`, { type: "LISTENING" });

  try {
    await sequelize.authenticate();
    console.info("[DB] Passed validation");
    await sequelize.sync({ alter: process.env.environment === "development" });
    console.info("[DB] Synchronized the database");
  } catch(e) {
    console.warn("[DB] Failed validation");
    console.error(e);
    process.exit(16);
  }

  setInterval(() => {
    client.guilds.cache.each(g => g.members.fetch());
    client.user.setActivity(`${client.users.cache.size} users across ${client.guilds.cache.size} servers`, { type: "LISTENING" });
  }, 60000);
});

client.on("interactionCreate", async (interaction) => {
  if(!interaction.inGuild()) return interactionEmbed(4, "[WARN-NODM]", "", interaction, client, [true, 10]);
  if(!ready) return interactionEmbed(4, "", "The bot is starting up, please wait", interaction, client, [true, 10]);
  
  if(interaction.type === InteractionType.ApplicationCommand) {
    let command = client.commands.get(interaction.commandName);
    await interaction.deferReply({ ephemeral: false });
    // await interaction.deferReply({ ephemeral: command.ephemeral });
    if(command) {
      command.run(client, interaction, interaction.options)
        .catch((e) => {
          interaction.editReply("Something went wrong while executing the command. Please report this to <@409740404636909578> (Tavi#0001)");
          toConsole(e.stack, new Error().stack, client);
        });
    }
    await wait(1e4);
    interaction.fetchReply()
      .then(m => {
        if(m.content === "" && m.embeds.length === 0) interactionEmbed(3, "[ERR-UNK]", "The command timed out and failed to reply in 10 seconds", interaction, client, [true, 15]);
      });
  } else {
    interaction.deferReply();
  }
});

client.on("messageCreate", async (message) => {
  /**
   * Conditions for automatic verification to work:
   * - Must have auto verification enabled
   * - Must have an introduction and verification channel
   * - Need VIEW_CHANNEL, SEND_MESSAGES, MANAGE_MESSAGES, and ADD_REACTIONS in verificationChannel
   * - Need VIEW_CHANNEL, SEND_MESSAGES, EMBED_LINKS, and ADD_FILES in welcomeChannel
   * - If roles need to be managed, must have MANAGE_ROLES permissions
   * - If there is a role that is higher than the bot, it will skip it
   */
  if(!ready) return;
  if(!message.guild) return;
  
  let settings;
  // Cache the settings for 30 seconds
  if(cache[0] + 30 < Math.floor(Date.now()/1000)) {
    settings = await client.models.Setting.findOne({ where: { guildId: message.guild.id } });
    cache = [Math.floor(Date.now()), settings];
  } else {
    settings = cache[1];
  }
  if(settings === null) return;
  if(message.author.bot) return;
  if(!settings.autoVerify) return;

  // Setting validation
  if(message.channel.id != settings.verificationChannel) return;
  await message.react("🕐");
  const reactions = message.reactions.cache.filter(r => r.emoji.name === "🕐");

  // Permissions checks
  if(!message.guild.me.permissionsIn(message.channel).has(11328)) {
    reactions.each(r => r.remove());
    return message.reply(`\`❌\` I am missing one or more of the following permissions in the list below in this channel. Please inform server staff of this issue\n>>> \`\`\`${message.guild.me.permissionsIn(message.channel).missing(11328).join("\n")}\`\`\``)
      .then(m => remove(7500, m, message));
  }
  if(settings.welcomeChannel != " " && !message.guild.me.permissionsIn(settings.welcomeChannel).has(51200)) {
    reactions.each(r => r.remove());
    return message.reply(`\`❌\` I am missing one or more of the following permissions in the list below in the welcome channel. Please inform server staff of this issue\n>>> ${message.guild.me.permissionsIn(settings.welcomeChannel).missing(51200).join("\n")}`)
      .then(m => remove(7500, m, message));
  }

  // Roles required
  if(settings.rolesRequired != " " && message.member.roles.cache.size < settings.rolesRequired) {
    reactions.each(r => r.remove());
    return message.reply({ content: `\`❌\` You need ${settings.rolesRequired} roles to verify, you currently have ${message.member.roles.cache.size} roles` })
      .then(m => remove(5000, m, message));
  }
  // Intro channel
  if(settings.introChannel === " ") {
    reactions.each(r => r.remove());
    return message.reply({ content: "`❌` The bot is not configured to have an intro channel" })
      .then(m => remove(5000, m, message));
  }
  const splitIntro = settings.introChannel.split(",");
  let intro = false;
  for(let i = 0; intro === false; i++) {
    if(i > splitIntro.length - 1) {
      reactions.each(r => r.remove());
      return message.reply({ content: `\`❌\` You need an introduction posted one of the following channels: <#${splitIntro.join(">, <#")}>` })
        .then(m => remove(5000, m, message));
    }
    await client.channels.cache.get(splitIntro[i]).messages.fetch();
    if(client.channels.cache.get(splitIntro[i]).messages.cache.some(m => m.author.id === message.author.id)) intro = true;
  }
  // VerificationPhrase
  if(settings.verificationPhrase != " " && message.content != settings.verificationPhrase) {
    reactions.each(r => r.remove());
    return message.reply({ content: "`❌` The password is incorrect" })
      .then(m => remove(5000, m, message));
  }

  // Apply roles
  if((settings.addRoles[0] != " " || settings.removeRoles[0] != " ") && !message.guild.me.permissions.has("MANAGE_ROLES")) {
    reactions.each(r => r.remove());
    return message.reply({ content: "`❌` I cannot modify roles. Please inform server staff of this issue" })
      .then(m => remove(5000, m, message));
  }
  const addRoles = settings.addRoles.split(",");
  for(const role of addRoles) {
    if(role === " ") continue;
    if(message.guild.me.roles.highest.comparePositionTo(message.guild.roles.cache.get(role)) <= 0) continue;
    if(message.member.roles.cache.has(role)) continue;
    await message.member.roles.add(role, `Automatic verification by ${client.user.tag} (${client.user.id})`);
  }
  await wait(250); // Prevent instant sending due to rate limits and potentially outdated caches
  await message.member.fetch();
  const removeRoles = settings.removeRoles.split(",");
  for(const role of removeRoles) {
    if(role === " ") continue;
    if(message.guild.me.roles.highest.comparePositionTo(message.guild.roles.cache.get(role)) <= 0) continue;
    if(!message.member.roles.cache.has(role)) continue;
    await message.member.roles.remove(role, `Automatic verification by ${client.user.tag} (${client.user.id})`);
  }

  // Welcome message
  if(settings.welcomeChannel != " ") {
    const welcomeMessage = await client.channels.cache.get(settings.welcomeChannel);
    const welcomeContent = settings.welcomeMessage
      .replaceAll("{{user}}", `<@${message.author.id}>`)
      .replaceAll("{{user.tag}}", `${message.author.username}`)
      .replaceAll("{{user.id}}", `${message.author.id}`)
      .replaceAll("{{guild}}", `${message.guild.name}`)
      .replaceAll("{{guild.id}}", `${message.guild.id}`)
      .replaceAll("{{guild.count}}", `${message.guild.memberCount}`)
      .replaceAll("{{guild.owner}}", `${(await message.guild.fetchOwner()).toString()}`)
      .replaceAll("{{guild.ownerNick", `${(await message.guild.fetchOwner()).nickname}`)
      .replaceAll("{{guild.ownerUser}}", `${(await message.guild.fetchOwner()).user.tag}`)
      .replaceAll("{{guild.ownerID}}", `${(await message.guild.fetchOwner()).id}`);

    welcomeMessage.send({ content: welcomeContent });
  }
  
  // Remove all items
  reactions.each(r => r.remove());
  return message.delete();

  // -- FUNCTION -- //
  function remove(delay, ...items) {
    setTimeout(() => {
      for(const item of items) {
        if(item.deletable) item.delete();
      }
    }, delay);
  }
});
//#endregion

client.login(config.bot.token);

//#region Error handling
process.on("uncaughtException", (err, origin) => {
  if(!ready) {
    console.warn("Exiting due to a [uncaughtException] during start up");
    console.error(err);
    console.error(origin);
    return process.exit(14);
  }
  toConsole(`An [uncaughtException] has occurred.\n\n> ${err}\n> ${origin}`, new Error().stack, client);
});
process.on("unhandledRejection", async (promise) => {
  if(!ready) {
    console.warn("Exiting due to a [unhandledRejection] during start up");
    console.error(promise);
    return process.exit(15);
  }
  const suppressChannel = await client.channels.fetch(config.discord.suppressChannel).catch(() => { return undefined; });
  if(!suppressChannel) return console.error(`An [unhandledRejection] has occurred.\n\n> ${promise}`);
  if(String(promise).includes("Interaction has already been acknowledged.") || String(promise).includes("Unknown interaction") || String(promise).includes("Unknown Message") || String(promise).includes("rCannot read properties of undefined (reading 'ephemeral')")) return suppressChannel.send(`A suppressed error has occured at process.on(unhandledRejection):\n>>> ${promise}`);
  toConsole(`An [unhandledRejection] has occurred.\n\n> ${promise}`, new Error().stack, client);
});
process.on("warning", async (warning) => {
  if(!ready) {
    console.warn("Heads up: there is a [warning] during start up");
    console.warn(warning);
  }
  toConsole(`A [warning] has occurred.\n\n> ${warning}`, new Error().stack, client);
});
process.on("exit", (code) => {
  console.error("[EXIT] The process is exiting!");
  console.error(`[EXIT] Code: ${code}`);
});
//#endregion
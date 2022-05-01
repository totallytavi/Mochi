const { Client, Collection } = require("discord.js");
const { REST } = require("@discordjs/rest");
const { Sequelize } = require("sequelize");
const { Routes } = require("discord-api-types/v9");
const { interactionEmbed, toConsole } = require("./functions.js");
const AsciiTable = require("ascii-table");
const config = require("./config.json");
const rest = new REST({ version: 9 }).setToken(config.bot.token);
const fs = require("fs");
const wait = require("util").promisify(setTimeout);
let ready = false;

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
  intents: ["GUILDS","GUILD_BANS","GUILD_MEMBERS","GUILD_MESSAGES"],
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
  const table = new AsciiTable("Commands");
  table.addRow("testing-file.js", "Loaded");
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
        table.addRow(command.name, "Loaded");
      }
    } catch(e) {
      console.warn(`[FILE-LOAD] Unloaded: ${file}`);
      console.warn(`[FILE-LOAD] ${e}`);
      table.addRow(file, "Unloaded");
    }
  }

  console.info("[FILE-LOAD] All files loaded into ASCII and ready to be sent");
  await wait(500); // Artificial wait to prevent instant sending
  const now = Date.now();

  try {
    console.info("[APP-CMD] Started refreshing application (/) commands.");

    await rest.put(
      Routes.applicationCommands(config.bot.applicationId),
      { body: slashCommands }
    );
    
    const then = Date.now();
    console.info(`[APP-CMD] Successfully reloaded application (/) commands after ${then - now}ms.`);
    console.info(table.toString());
  } catch(error) {
    console.error("[APP-CMD] An error has occurred while attempting to refresh application commands.");
    console.error(`[APP-CMD] ${error}`);
    console.info(table.toString());
  }
  console.info("[FILE-LOAD] All files loaded successfully");
  ready = true;
})();
//#endregion

//#region Events
client.on("ready", async () => {
  console.info("[READY] Client is ready");
  console.info(`[READY] Logged in as ${client.user.tag} (${client.user.id}) at ${new Date()}`);
  toConsole(`[READY] Logged in as ${client.user.tag} (${client.user.id}) at <t:${Math.floor(Date.now()/1000)}:T>`, "client.on(ready)", client);
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
  
  if(interaction.isCommand()) {
    let command = client.commands.get(interaction.commandName);
    await interaction.deferReply({ ephemeral: command.ephemeral });
    if(command) {
      command.run(client, interaction, interaction.options)
        .catch((e) => {
          interaction.editReply("Something went wrong while executing the command. Please report this to <@409740404636909578> (Tavi#0001)");
          toConsole(e.stack, `command.run(${command.name})`, client);
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
   * - Must have VIEW_CHANNEL, SEND_MESSAGES, and ADD_REACTIONS permissions
   * - If roles need to be managed, must have MANAGE_ROLES permissions
   * - If there is a role that is higher than the bot, it will skip it
   */
  if(!ready) return;
  if(!message.guild) return;
  if(message.guild.id != "773830685659496449") return;
  
  const settings = await client.models.Setting.findOne({ where: { guildId: message.guild.id } });
  if(settings === null) return;
  if(message.author.bot) return;
  if(!settings.autoVerify) return;
  if(!message.guild.me.permissionsIn(message.channel).has(3136)) return;

  // Setting validation
  if(message.channel.id != settings.verificationChannel) return;
  await message.react("🕐");
  await wait(2e3);
  const reactions = message.reactions.cache.filter(r => r.emoji.name === "🕐");

  // Roles required
  if(settings.rolesRequired != " " && message.member.roles.cache.size < settings.rolesRequired) {
    reactions.each(r => r.remove());
    return message.channel.send({ content: `\`❌\` You need ${settings.rolesRequired} roles to verify, you currently have ${message.member.roles.cache.size} roles`, target: message })
      .then(m => {
        setTimeout(() => {
          m.delete();
          message.delete();
        }, 5e3);
      });
  }
  // Intro channel
  if(settings.introChannel === " ") {
    reactions.each(r => r.remove());
    return message.delete();
  }
  await client.channels.cache.get(settings.introChannel).messages.fetch();
  if(client.channels.cache.get(settings.introChannel).messages.cache.filter(m => m.author.id === message.author.id).size < 1) {
    reactions.each(r => r.remove());
    return message.channel.send({ content: `\`❌\` You need an introduction posted in <#${settings.introChannel}>`, target: message })
      .then(m => {
        setTimeout(() => {
          m.delete();
          message.delete();
        }, 5e3);
      });
  }
  // Password
  if(settings.password != " " && message.content != settings.password) {
    reactions.each(r => r.remove());
    return message.channel.send({ content: "`❌` The password is incorrect", target: message })
      .then(m => {
        setTimeout(() => {
          m.delete();
          message.delete();
        }, 5e3);
      });
  }

  // Apply roles
  if((settings.addRoles[0] != " " || settings.removeRoles[0] != " ") && !message.guild.me.permissions.has("MANAGE_ROLES")) {
    reactions.each(r => r.remove());
    return message.channel.send({ content: "`❌` I cannot modify roles. Please inform server staff of this issue", target: message })
      .then(m => {
        setTimeout(() => {
          m.delete();
          message.delete();
        }, 5e3);
      });
  }
  const addRoles = settings.addRoles.split(",");
  for(const role of addRoles) {
    if(role === " ") continue;
    if(message.guild.me.roles.highest.comparePositionTo(message.guild.roles.cache.get(role)) <= 0) continue;
    if(message.member.roles.cache.has(role)) continue;
    await message.member.roles.add(role, `Automatic verification by ${client.user.tag} (${client.user.id})`);
  }
  await wait(1000); // Prevent instant sending due to rate limits and potentially outdated caches
  await message.member.fetch();
  const removeRoles = settings.removeRoles.split(",");
  for(const role of removeRoles) {
    if(role === " ") continue;
    if(message.guild.me.roles.highest.comparePositionTo(message.guild.roles.cache.get(role)) <= 0) continue;
    if(message.member.roles.cache.has(role)) continue;
    await message.member.roles.remove(role, `Automatic verification by ${client.user.tag} (${client.user.id})`);
  }
  
  // Remove all remaining evidence
  reactions.each(r => r.remove());
  return message.delete();
});
//#endregion

client.login(config.bot.token);

//#region Error handling
process.on("uncaughtException", (err, origin) => {
  if(!ready) {
    console.warn("Exiting due to a [unhandledRejection] during start up");
    console.error(err);
    console.error(origin);
    return process.exit(14);
  }
  toConsole(`An [uncaughtException] has occurred.\n\n> ${err}\n> ${origin}`, "process.on('uncaughtException')", client);
});
process.on("unhandledRejection", (promise) => {
  if(!ready) {
    console.warn("Exiting due to a [unhandledRejection] during start up");
    console.error(promise);
    return process.exit(15);
  }
  if(String(promise).includes("Interaction has already been acknowledged.") || String(promise).includes("Unknown interaction") || String(promise).includes("Unknown Message")) return client.channels.cache.get(config.discord.suppressChannel).send(`A suppressed error has occured at process.on(unhandledRejection):\n>>> ${promise}`);
  toConsole(`An [unhandledRejection] has occurred.\n\n> ${promise}`, "process.on('unhandledRejection')", client);
});
process.on("warning", async (warning) => {
  if(!ready) {
    console.warn("Heads up: there is a [warning] during start up");
    console.warn(warning);
  }
  toConsole(`A [warning] has occurred.\n\n> ${warning}`, "process.on('warning')", client);
});
process.on("exit", (code) => {
  console.error("[EXIT] The process is exiting!");
  console.error(`[EXIT] Code: ${code}`);
});
//#endregion
const { SlashCommandBuilder } = require("@discordjs/builders");
// eslint-disable-next-line no-unused-vars
const { Client, CommandInteraction, CommandInteractionOptionResolver, MessageEmbed, MessageButton } = require("discord.js");
const { SelectMenuOptionData } = require("../classes/SelectMenuOptionData.js");
const { awaitButtons, awaitMenu, interactionEmbed } = require("../functions.js");

module.exports = {
  name: "settings",
  ephemeral: false,
  data: new SlashCommandBuilder()
    .setName("settings")
    .setDescription("View and edit your settings.")
    .addSubcommand(subcommand => {
      return subcommand
        .setName("view")
        .setDescription("View your settings.");
    })
    .addSubcommand(subcommand => {
      return subcommand
        .setName("set")
        .setDescription("Set your settings.");
    }),
  /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {CommandInteractionOptionResolver} options
     */
  run: async (client, interaction, options) => {
    if((await client.models.Setting.findOne({ where: { guildId: interaction.guild.id } })) === null) await client.models.Setting.create({ guildId: interaction.guild.id, autoVerify: false, verificationChannel: " ", addRoles: " ", removeRoles: " ", rolesRequired: 0, introChannel: " ", verificationPhrase: " ", welcomeChannel: " ", welcomeMessage: " " });
    const settings = await client.models.Setting.findOne({ where: { guildId: interaction.guild.id } });
    const subcommand = options.getSubcommand();
    const filter = (m) => m.author.id === interaction.user.id;
    const vars = [
      ["{{user}}", "Mentions the user"],
      ["{{user.tag}}", "User tag"],
      ["{{user.id}}", "User ID"],
      ["{{guild}}", "Server name"],
      ["{{guild.id}}", "Server ID"],
    ];
    
    // Permission checks
    if(!interaction.member.permissions.has("MANAGE_ROLES")) return interactionEmbed(3, "[ERR-UPRM]", "You must be able to manage roles to use this command", interaction, client, [true, 15]);

    if(subcommand === "view") {
      if(settings === null) return interaction.followUp({ content: "No settings found for your server!" });
      await interaction.editReply({ content: "Your settings have been shown as a message only you can see" });

      interaction.followUp({ embeds: [new MessageEmbed({
        title: "Settings",
        description: `Settings for \`${interaction.guild.name}\``,
        fields: [
          { name: "Auto Verify", value: settings.autoVerify === true ? "Enabled" : "Disabled", inline: true },
          { name: "Password", value: settings.verificationPhrase === " " ? "(None set)" : `||${settings.verificationPhrase}||`, inline: true },
          { name: "Verification Channel", value: settings.verificationChannel === " " ? "(No channel)" : `<#${settings.verificationChannel}>`, inline: true },
          { name: "Welcome Channel", value: settings.welcomeChannel === " " ? "(No channel)" : `<#${settings.welcomeChannel}>`, inline: true },
          { name: "Welcome Message", value: settings.welcomeMessage === " " ? "(None set)" : settings.welcomeMessage, inline: true },
          { name: "Intro Channel", value: settings.introChannel === " " ? "(No channel)" : `<#${settings.introChannel}>`, inline: true },
          { name: "Roles Required", value: String(settings.rolesRequired), inline: true },
          { name: "Add Roles", value: settings.addRoles.split(",")[0] != " " ? settings.addRoles.split(",").map(i => `<@&${i}>`).join(", ") : "(None set)", inline: true },
          { name: "Remove Roles", value: settings.removeRoles.split(",")[0] != " " ? settings.removeRoles.split(",").map(i => `<@&${i}>`).join(", ") : "(None set)", inline: true },
        ]
      })], ephemeral: true });

      setTimeout(async () => { if(!(await interaction.fetchReply()).deleted) interaction.deleteReply(); }, 10000);
    } else if(subcommand === "set") {
      // If we cannot see the channel and its messages, return
      if(!interaction.guild.me.permissionsIn(interaction.channel).has(68608)) return interactionEmbed(3, "[ERR-BPRM]", "I cannot read messages, send messages, or read the view history of this channel. Please grant me these permissions then try again", interaction, client, [true, 10]);

      const option = await awaitMenu(interaction, 15, [1, 1], [
        new SelectMenuOptionData({ value: "autoVerify", label: "Automatic verification", description: "Applys roles when a user says a password in a channel", emoji: "🛂" }).toJSON(),
        new SelectMenuOptionData({ value: "verificationPassword", label: "Verification password", description: "Phrase required to trigger automatic verification", emoji: "🔐" }).toJSON(),
        new SelectMenuOptionData({ value: "verificationChannel", label: "Verification channel", description: "Channel for users to enter the password in", emoji: "🛡️" }).toJSON(),
        new SelectMenuOptionData({ value: "welcomeMessage", label: "Welcome message", description: "Message to send to new users", emoji: "📬" }).toJSON(),
        new SelectMenuOptionData({ value: "welcomeChannel", label: "Welcome channel", description: "Channel to send the welcome message in", emoji: "📪" }).toJSON(),
        new SelectMenuOptionData({ value: "introChannel", label: "Intro channel", description: "Channel for users to place their introduction in", emoji: "👋" }).toJSON(),
        new SelectMenuOptionData({ value: "rolesRequired", label: "Roles required", description: "Number of roles required to trigger automatic verification", emoji: "🔢" }).toJSON(),
        new SelectMenuOptionData({ value: "addRoles", label: "Add roles", description: "Roles to add when a user says a password in a channel", emoji: "📤" }).toJSON(),
        new SelectMenuOptionData({ value: "removeRoles", label: "Remove roles", description: "Roles to remove when a user says a password in a channel", emoji: "📥" }).toJSON(),
      ], "What option would you like to set?", false);
      if(option === null) return;
      await option.deleteReply();

      if(option.values[0] === "autoVerify") {
        const newValue = await awaitButtons(interaction, 15, [
          new MessageButton({ style: "PRIMARY", customId: "yes", label: "Yes" }),
          new MessageButton({ style: "SECONDARY", customId: "no", label: "No" })
        ], "Do you want to automatically verify members?", true);
        await newValue.deleteReply();
        if(newValue === null) return;

        await client.models.Setting.update({ autoVerify: newValue.customId === "yes" ? true : false }, { where: { guildId: interaction.guild.id } });

        interactionEmbed(1, "", `Successfully ${newValue.customId === "yes" ? "enabled" : "disabled"} automatic verification. Make sure to check your settings`, interaction, client, [true, 20]);
      } else if(option.values[0] === "verificationPassword") {
        await interaction.editReply({ content: "Please enter the password that users must say to trigger verification **(Case sensitive)**" });
        const password = await interaction.channel
          .awaitMessages({ filter, max: 1, time: 15000, errors: ["time"] })
          .catch(() => { return undefined; });

        if(!password) return interactionEmbed(3, "[ERR-ARGS]", "No password was entered", interaction, client, [true, 10]);
        password.first().delete();
        if(password.first().content === "(None set)") return interactionEmbed(3, "[ERR-ARGS]", "You cannot use the default password", interaction, client, [true, 10]);
        if(password.first().content.length > 32) return interactionEmbed(3, "[ERR-ARGS]", "Your password is too long (Max: 32 characters)", interaction, client, [true, 10]);
        await client.models.Setting.update({ verificationPhrase: password.first().content }, { where: { guildId: interaction.guild.id } });
        interactionEmbed(1, "", `Successfully set the password to \`${password.first().content}\``, interaction, client, [true, 15]);
      } else if(option.values[0] === "addRoles") {
        await interaction.editReply({ content: "Please mention the roles (Separated by commas) to add when a user says the password" });
        const roles = await interaction.channel
          .awaitMessages({ filter, max: 1, time: 15000, errors: ["time"] })
          .catch(() => { return undefined; });
        
        if(!roles) return interactionEmbed(3, "[ERR-ARGS]", "You didn't enter valid role(s)", interaction, client, [true, 10]);
        if(roles.first().mentions.roles.length === 0) return interactionEmbed(3, "[ERR-ARGS]", "You didn't enter valid role(s)", interaction, client, [true, 10]);
        const cleanRoles = roles.first().mentions.roles.map((_k, v) => v.replace(/[<@&>]/g, ""));
        roles.first().delete();
        if(!cleanRoles.some(i => { return settings.removeRoles.split(",").indexOf(i) === -1; })) return interactionEmbed(3, "[ERR-ARGS]", "There is a conflict! One of the roles mentioned is in the remove roles list", interaction, client, [true, 10]);
        await client.models.Setting.update({ addRoles: cleanRoles.join(",") }, { where: { guildId: interaction.guild.id } });
        interactionEmbed(1, "", `Successfully set the roles to add to members when they say the password to: ${cleanRoles.map(i => `<@&${i}>`).join(", ")}`, interaction, client, [true, 20]);
      } else if(option.values[0] === "removeRoles") {
        await interaction.editReply({ content: "Please mention the roles (Separated by commas) to remove when a user says the password" });
        const roles = await interaction.channel
          .awaitMessages({ filter, max: 1, time: 15000, errors: ["time"] })
          .catch(() => { return undefined; });
        
        if(!roles) return interactionEmbed(3, "[ERR-ARGS]", "You didn't enter valid role(s)", interaction, client, [true, 10]);
        if(roles.first().mentions.roles.length === 0) return interactionEmbed(3, "[ERR-ARGS]", "You didn't enter valid role(s)", interaction, client, [true, 10]);
        roles.first().delete();
        const cleanRoles = roles.first().mentions.roles.map((_k, v) => v.replace(/[<@&>]/g, ""));
        if(!cleanRoles.some(i => { return settings.addRoles.split(",").indexOf(i) === -1; })) return interactionEmbed(3, "[ERR-ARGS]", "There is a conflict! One of the roles mentioned is in the add roles list", interaction, client, [true, 10]);
        await client.models.Setting.update({ removeRoles: cleanRoles.join(",") }, { where: { guildId: interaction.guild.id } });
        interactionEmbed(1, "", `Successfully set the roles to remove from members when they say the password to: ${cleanRoles.map(i => `<@&${i}>`).join(", ")}`, interaction, client, [true, 20]);
      } else if(option.values[0] === "introChannel") {
        await interaction.editReply({ content: "Please mention the channels (Separated by commas) to use as introduction channels" });
        const channels = await interaction.channel
          .awaitMessages({ filter, max: 1, time: 15000, errors: ["time"] })
          .catch(() => { return undefined; });
        
        if(!channels) return interactionEmbed(3, "[ERR-ARGS]", "You didn't enter valid channel(s)", interaction, client, [true, 10]);
        if(channels.first().mentions.channels.length === 0) return interactionEmbed(3, "[ERR-ARGS]", "You didn't enter valid channel(s)", interaction, client, [true, 10]);
        const cleanChannels = channels.first().mentions.roles.map((_k, v) => v.replace(/[<#>]/g, ""));
        channels.first().delete();
        await client.models.Setting.update({ addRoles: cleanChannels.join(",") }, { where: { guildId: interaction.guild.id } });
        interactionEmbed(1, "", `Successfully set the roles to add to members when they say the password to: ${cleanChannels.map(i => `<@&${i}>`).join(", ")}`, interaction, client, [true, 20]);
      } else if(option.values[0] === "rolesRequired") {
        await interaction.editReply({ content: "Please say how many roles are needed to pass verification (1, etc.)" });
        const num = await interaction.channel
          .awaitMessages({ filter, max: 1, time: 15000, errors: ["time"] })
          .catch(() => { return undefined; });

        if(!num) return interactionEmbed(3, "[ERR-ARGS]", "You didn't enter a valid number", interaction, client, [true, 10]);
        const cleanNumber = Math.floor(num.first().content);
        num.first().delete();
        if(cleanNumber === "NaN") return interactionEmbed(3, "[ERR-ARGS]", "You didn't enter a valid number", interaction, client, [true, 10]);
        if(cleanNumber < 1 || cleanNumber > 15) return interactionEmbed(3, "[ERR-ARGS]", "Your number cannot be lower than 1 or higher than 15", interaction, client, [true, 10]);
        await client.models.Setting.update({ rolesRequired: cleanNumber }, { where: { guildId: interaction.guild.id } });
        interactionEmbed(1, "", `Successfully set the number of roles required to pass verification to: ${cleanNumber}`, interaction, client, [true, 20]);
      } else if(option.values[0] === "verificationChannel") {
        await interaction.editReply({ content: "Please mention the channel where users will verify themselves" });
        const channel = await interaction.channel
          .awaitMessages({ filter, max: 1, time: 15000, errors: ["time"] })
          .catch(() => { return undefined; });
        
        if(!channel) return interactionEmbed(3, "[ERR-ARGS]", "You didn't enter a valid channel", interaction, client, [true, 10]);
        if(channel.first().mentions.length === 0) return interactionEmbed(3, "[ERR-ARGS]", "You didn't enter a valid channel", interaction, client, [true, 10]);
        channel.first().delete();
        const cleanChannel = channel.first().mentions.channels.first().toString().replace(/[<#>]/g, "");
        await client.models.Setting.update({ verificationChannel: cleanChannel }, { where: { guildId: interaction.guild.id } });
        interactionEmbed(1, "", `Successfully set the verification channel to: <#${cleanChannel}>`, interaction, client, [true, 20]);
      } else if(option.values[0] === "welcomeMessage") {
        await interaction.editReply({ content: `Please say the welcome message. Variables are listed below\n\n>>> ${vars.map(v => `${v[0]}: ${v[1]}`).join("\n")}` });
        const message = await interaction.channel
          .awaitMessages({ filter, max: 1, time: 30000, errors: ["time"] })
          .catch(() => { return undefined; });

        if(!message) return interactionEmbed(3, "[ERR-ARGS]", "You didn't enter a valid message", interaction, client, [true, 10]);
        message.first().delete();
        const cleanMessage = message.first().content;
        await client.models.Setting.update({ welcomeMessage: cleanMessage }, { where: { guildId: interaction.guild.id } });
        interactionEmbed(1, "", `Successfully set the welcome message to: ${cleanMessage}`, interaction, client, [true, 20]);
      } else if(option.values[0] === "welcomeChannel") {
        await interaction.editReply({ content: "Please mention the channel to place the welcome message in" });
        const channel = await interaction.channel
          .awaitMessages({ filter, max: 1, time: 15000, errors: ["time"] })
          .catch(() => { return undefined; });

        if(!channel) return interactionEmbed(3, "[ERR-ARGS]", "You didn't enter a valid channel", interaction, client, [true, 10]);
        if(channel.first().mentions.length === 0) return interactionEmbed(3, "[ERR-ARGS]", "You didn't enter a valid channel", interaction, client, [true, 10]);
        channel.first().delete();
        const cleanChannel = channel.first().mentions.channels.first().toString().replace(/[<#>]/g, "");
        await client.models.Setting.update({ welcomeChannel: cleanChannel }, { where: { guildId: interaction.guild.id } });
        interactionEmbed(1, "", `Successfully set the welcome channel to: <#${cleanChannel}>`, interaction, client, [true, 20]);
      }
    }
  }
};
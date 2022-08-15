// eslint-disable-next-line no-unused-vars
const { Client, CommandInteraction, CommandInteractionOptionResolver, SlashCommandBuilder, PermissionFlagsBits} = require("discord.js");
const { interactionEmbed, toConsole } = require("../functions.js");

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
        .setDescription("Set your settings.")
        .addStringOption(option => {
          return option
            .setName("option")
            .setDescription("The option to change")
            .setRequired(true)
            .addChoices(
              {
                "name": "Automatic Verification",
                "value": "verification_toggle"
              },
              {
                "name": "Verification Password",
                "value": "verification_password"
              },
              {
                "name": "Welcome Channel",
                "value": "channels_welcome"
              },
              {
                "name": "Welcome Message",
                "value": "verification_welcome"
              },
              {
                "name": "Verification Channel",
                "value": "channels_verification"
              },
              {
                "name": "Introduction Channel",
                "value": "channels_introduction"
              },
              {
                "name": "Roles Needed",
                "value": "roles_amount"
              },
              {
                "name": "Add Roles",
                "value": "roles_add"
              },
              {
                "name": "Remove Roles",
                "value": "roles_remove"
              }
            );
        })
        .addStringOption(option => {
          return option
            .setName("value")
            .setDescription("Value of the option. Use /help to learn more about the options")
            .setRequired(true);
        });
    }),
  /**
     * @param {Client} client
     * @param {CommandInteraction} interaction
     * @param {CommandInteractionOptionResolver} options
     */
  run: async (client, interaction, options) => {
    const [settings] = await client.models.Setting.findOrCreate({
      where: {
        guildId: interaction.guild.id
      },
      defaults: {
        guildId: interaction.guild.id,
        verification_toggle: false,
        verification_password: " ",
        verification_welcome: " ",
        channels_verification: " ",
        channels_welcome: " ",
        channels_introduction: " ",
        roles_add: " ",
        roles_remove: " ",
        roles_amount: 0
      }
    });
    const subcommand = options.getSubcommand();
    
    // Permission checks
    if(!interaction.member.permissions.has(PermissionFlagsBits.ManageRoles)) return interactionEmbed(3, "[ERR-UPRM]", "You must be able to manage roles to use this command", interaction, client, [true, 15]);

    if(subcommand === "view") {
      if(settings === null) return interaction.followUp({ content: "No settings found for your server!" });
      await interaction.editReply({ content: "Your settings have been shown as a message only you can see" });

      interaction.followUp({ embeds: [{
        title: "Settings",
        description: `Settings for \`${interaction.guild.name}\``,
        fields: [
          { name: "Auto Verify", value: !settings.verification_toggle ? "Disabled" : "Enabled", inline: true },
          { name: "Password", value: settings.verification_password === " " ? "(None set)" : `||${settings.verification_password}||`, inline: true },
          { name: "Verification Channel", value: settings.channels_verification === " " ? "(No channel)" : `<#${settings.channels_verification}>`, inline: true },
          { name: "Welcome Channel", value: settings.channels_welcome === " " ? "(No channel)" : `<#${settings.channels_welcome}>`, inline: true },
          { name: "Welcome Message", value: settings.verification_welcome === " " ? "(None set)" : String(settings.verification_welcome), inline: true },
          { name: "Intro Channel", value: settings.channels_introduction === " " ? "(No channel)" : `<#${settings.channels_introduction.split(",").join(">, <#")}>`, inline: true },
          { name: "Roles Required", value: String(settings.roles_amount), inline: true },
          { name: "Add Roles", value: settings.roles_add != " " ? `<@&${settings.roles_add.split(",").join(">, <@&")}>` : "(None set)", inline: true },
          { name: "Remove Roles", value: settings.roles_remove != " " ? `<@&${settings.roles_remove.split(",").join(">, <@&")}>` : "(None set)", inline: true },
        ]
      }], ephemeral: true });

      setTimeout(() => {
        interaction.deleteReply();
      }, 12_500);
    } else if(subcommand === "set") {
      // If we cannot see the channel and its messages, return
      if(!interaction.guild.members.me.permissionsIn(interaction.channel).has(68608)) return interactionEmbed(3, "[ERR-BPRM]", "I cannot read messages, send messages, or read the view history of this channel. Please grant me these permissions then try again", interaction, client, [true, 10]);
      const option = options.getString("option");
      let value = options.getString("value");
      let error = false;
      switch(option) {
      case "verification_toggle": {
        let bool = value.trim().toLowerCase();
        if(typeof bool == "boolean") return interactionEmbed(3, "[ERR-ARGS]", "You must enter a truthy of falsy value (0/1, true/false)", interaction, client, [true, 15]);
        bool = JSON.parse(bool.toLowerCase());
        try {
          client.models.Setting.update({
            verification_toggle: bool
          }, {
            where: {
              guildId: interaction.guild.id
            }
          });
        } catch(e) {
          toConsole(`An error has occurred while updating \`verification_toggle\`: ${String(e)}`, new Error().stack, client);
          error = true;
        }
        if(error) return interactionEmbed(3, "[SQL-ERR]", "An error occurred while updating the settings", interaction, client, [true, 15]);
        interactionEmbed(1, "", `${bool ? "Enabled" : "Disabled"} automatic verification`, interaction, client, [true, 10]);
        break;
      }
      case "verification_password": {
        value = String(value);
        // Prevent leaking of properties
        if(value.trim().length < 3 || value.trim().length > 128) return interactionEmbed(3, "[ERR-ARGS]", "You must enter a password longer than 3 characters and shorter than 128 characters", interaction, client, [true, 15]);
        try {
          client.models.Setting.update({
            verification_password: value.trim()
          }, {
            where: {
              guildId: interaction.guild.id
            }
          });
        } catch(e) {
          toConsole(`An error has occurred while updating \`verification_password\`: ${String(e)}`, new Error().stack, client);
          error = true;
        }
        if(error) return interactionEmbed(3, "[ERR-SQL]", "An error occurred while updating the settings", interaction, client, [true, 15]);
        interactionEmbed(1, "", `Set the password to: ||\`${value.trim()}\`||`, interaction, client, [true, 10]);
        break;
      }
      case "verification_welcome": {
        if(value.trim().length < 1 || value.trim().length > 1024) return interactionEmbed(3, "[ERR-ARGS]", "You must enter a message longer than 1 character and shorter than 1024 characters", interaction, client, [true, 15]);
        try {
          client.models.Setting.update({
            verification_welcome: value.trim()
          }, {
            where: {
              guildId: interaction.guild.id
            }
          });
        } catch(e) {
          toConsole(`An error has occurred while updating \`verification_welcome\`: ${String(e)}`, new Error().stack, client);
          error = true;
        }
        if(error) return interactionEmbed(3, "[ERR-SQL]", "An error occurred while updating the settings", interaction, client, [true, 15]);
        interactionEmbed(1, "", `Set the welcome message to: \`${value.trim()}\``, interaction, client, [true, 10]);
        break;
      }
      case "channels_verification": {
        const channelRegex = /^<#[0-9]{18}>$/;
        if(!interaction.guild.channels.cache.has(value.trim()) && !channelRegex.test(value.trim())) return interactionEmbed(3, "[ERR-ARGS]", "You must enter a valid channel mention or ID", interaction, client, [true, 15]);
        if(channelRegex.test(value.trim()) && !interaction.guild.channels.cache.has(value.trim().replace(/^<#/, "").replace(/>$/, ""))) return interactionEmbed(3, "[ERR-ARGS]", "You must enter a valid channel mention", interaction, client, [true, 15]);
        try {
          client.models.Setting.update({
            channels_verification: channelRegex.test(value.trim()) ? value.trim().replace(/^<#/, "").replace(/>$/, "") : value.trim()
          }, {
            where: {
              guildId: interaction.guild.id
            }
          });
        } catch(e) {
          toConsole(`An error has occurred while updating \`verification_channel\`: ${String(e)}`, new Error().stack, client);
          error = true;
        }
        if(error) return interactionEmbed(3, "[ERR-SQL]", "An error occurred while updating the settings", interaction, client, [true, 15]);
        interactionEmbed(1, "", `Set the verification channel to: <#${channelRegex.test(value.trim()) ? value.trim().replace(/^<#/, "").replace(/>$/, "") : value.trim()}>`, interaction, client, [true, 10]);
        break;
      }
      case "channels_introduction": {
        const channelRegex = /^<#[0-9]{18}>$/;
        // Accept multiple channel IDs or mentions, separated by spaces or commas
        const channels = value.trim().split(/[ ,]+/);
        for(let i = 0; i < channels.length; i++) {
          if(channels[i] == "") channels.splice(channels[i], 1); // Ignore empty strings
          if(!interaction.guild.channels.cache.has(channels[i]) && !channelRegex.test(channels[i])) return interactionEmbed(3, "[ERR-ARGS]", `You must enter valid channel mentions or IDs (${i})`, interaction, client, [true, 15]);
          if(channelRegex.test(channels[i]) && !interaction.guild.channels.cache.has(channels[i].replace(/^<#/, "").replace(/>$/, ""))) return interactionEmbed(3, "[ERR-ARGS]", `You must enter valid channel mentions (${i})`, interaction, client, [true, 15]);
          if(channelRegex.test(channels[i])) channels[i] = channels[i].replace(/^<#/, "").replace(/>$/, ""); // Strip ID from channel mention
        }
        try {
          client.models.Setting.update({
            channels_introduction: channels.join(",")
          }, {
            where: {
              guildId: interaction.guild.id
            }
          });
        } catch(e) {
          toConsole(`An error has occurred while updating \`channels_introduction\`: ${String(e)}`, new Error().stack, client);
          error = true;
        }
        if(error) return interactionEmbed(3, "[ERR-SQL]", "An error occurred while updating the settings", interaction, client, [true, 15]);
        interactionEmbed(1, "", `Set the introduction channels to: <#${channels.join(">, <#")}>`, interaction, client, [true, 10]);
        break;
      }
      case "channels_welcome": {
        const channelRegex = /^<#[0-9]{18}>$/;
        if(!interaction.guild.channels.cache.has(value.trim()) && !channelRegex.test(value.trim())) return interactionEmbed(3, "[ERR-ARGS]", "You must enter a valid channel mention or ID", interaction, client, [true, 15]);
        if(channelRegex.test(value.trim()) && !interaction.guild.channels.cache.has(value.trim().replace(/^<#/, "").replace(/>$/, ""))) return interactionEmbed(3, "[ERR-ARGS]", "You must enter a valid channel mention", interaction, client, [true, 15]);
        try {
          client.models.Setting.update({
            channels_welcome: channelRegex.test(value.trim()) ? value.trim().replace(/^<#/, "").replace(/>$/, "") : value.trim()
          }, {
            where: {
              guildId: interaction.guild.id
            }
          });
        } catch(e) {
          toConsole(`An error has occurred while updating \`channels_welcome\`: ${String(e)}`, new Error().stack, client);
          error = true;
        }
        if(error) return interactionEmbed(3, "[ERR-SQL]", "An error occurred while updating the settings", interaction, client, [true, 15]);
        interactionEmbed(1, "", `Set the welcome channel to: <#${channelRegex.test(value.trim()) ? value.trim().replace(/^<#/, "").replace(/>$/, "") : value.trim()}>`, interaction, client, [true, 10]);
        break;
      }
      case "roles_amount": {
        if(isNaN(value.trim())) return interactionEmbed(3, "[ERR-ARGS]", "You must enter a number", interaction, client, [true, 15]);
        if(parseInt(value.trim()) > 249) return interactionEmbed(3, "[ERR-ARGS]", "You cannot select more than 249 roles", interaction, client, [true, 15]);
        try {
          client.models.Setting.update({
            roles_amount: parseInt(value.trim())
          }, {
            where: {
              guildId: interaction.guild.id
            }
          });
        } catch(e) {
          toConsole(`An error has occurred while updating \`role_amount\`: ${String(e)}`, new Error().stack, client);
          error = true;
        }
        if(error) return interactionEmbed(3, "[ERR-SQL]", "An error occurred while updating the settings", interaction, client, [true, 15]);
        interactionEmbed(1, "", `Set the role amount to: \`${value.trim()}\``, interaction, client, [true, 10]);
        break;
      }
      case "roles_add": {
        // Accept role IDs or mentions separated by commas (Commas with spaces are allowed)
        value = value.trim().split(/[, ]+/);
        if(value.length > 249) return interactionEmbed(3, "[ERR-ARGS]", "You cannot select more than 249 roles", interaction, client, [true, 15]);
        for(let i = 0; i < value.length; i++) {
          if(value[i] == "") value.splice(value[i], 1); // Ignore empty strings
          value[i] = value[i].replace("<@&", "").replace(">", ""); // Strip the mention if it exists
          if(!parseInt(value[i]))
            return interactionEmbed(3, "[ERR-ARGS]", "You must enter a valid role ID or mention", interaction, client, [true, 15]); 
          if(!interaction.guild.roles.cache.has(value[i]))
            return interactionEmbed(3, "[ERR-ARGS]", "You must enter a valid role ID", interaction, client, [true, 15]);
          if(settings.roles_remove.split(",").includes(value[i]))
            return interactionEmbed(3, "[ERR-ARGS]", "You cannot add a role that is already in the remove list", interaction, client, [true, 15]);
        }
        try {
          client.models.Setting.update({
            roles_add: value.join(",")
          }, {
            where: {
              guildId: interaction.guild.id
            }
          });
        } catch(e) {
          toConsole(`An error has occurred while updating \`roles_add\`: ${String(e)}`, new Error().stack, client);
          error = true;
        }
        if(error) return interactionEmbed(3, "[ERR-SQL]", "An error occurred while updating the settings", interaction, client, [true, 15]);
        interactionEmbed(1, "", `Added the following roles to the add list: \`${value.join(", ")}\``, interaction, client, [true, 10]);
        break;
      }
      case "roles_remove": {
        // Accept role IDs or mentions separated by commas (Commas with spaces are allowed)
        value = value.trim().split(/[, ]+/);
        if(value.length > 249) return interactionEmbed(3, "[ERR-ARGS]", "You cannot select more than 249 roles", interaction, client, [true, 15]);
        for(let i = 0; i < value.length; i++) {
          if(value[i] == "") value.splice(value[i], 1); // Ignore empty strings
          value[i] = value[i].replace("<@&", "").replace(">", ""); // Strip the mention if it exists
          if(!parseInt(value[i]))
            return interactionEmbed(3, "[ERR-ARGS]", "You must enter a valid role ID or mention", interaction, client, [true, 15]); 
          if(!interaction.guild.roles.cache.has(value[i]))
            return interactionEmbed(3, "[ERR-ARGS]", "You must enter a valid role ID", interaction, client, [true, 15]);
          if(settings.roles_add.split(",").includes(value[i]))
            return interactionEmbed(3, "[ERR-ARGS]", "You cannot add a role that is already in the add list", interaction, client, [true, 15]);
        }
        try {
          client.models.Setting.update({
            roles_remove: value.join(",")
          }, {
            where: {
              guildId: interaction.guild.id
            }
          });
        } catch(e) {
          toConsole(`An error has occurred while updating \`roles_remove\`: ${String(e)}`, new Error().stack, client);
          error = true;
        }
        if(error) return interactionEmbed(3, "[ERR-SQL]", "An error occurred while updating the settings", interaction, client, [true, 15]);
        interactionEmbed(1, "", `Added the following roles to the remove list: \`${value.join(", ")}\``, interaction, client, [true, 10]);
        break;
      }
      }
    }
  }
};
// eslint-disable-next-line no-unused-vars
const { Client, EmbedBuilder, Interaction, ActionRow, ButtonBuilder } = require("discord.js");
const config = require("./config.json");

const errors = {
  "[SQL-ERR]": "An error has occurred while trying to execute a MySQL query",
  "[ERR-CLD]": "You are on cooldown!",
  "[ERR-UPRM]": "You do not have the proper permissions to execute this command",
  "[ERR-BPRM]": "I do not have the proper permissions to execute this command",
  "[ERR-ARGS]": "You have not supplied the correct parameters. Please check again",
  "[ERR-UNK]": "I can't tell why an issue spawned. Please report this to a developer",
  "[ERR-MISS]": "I cannot find the information in the system",
  "[WARN-NODM]": "Sorry, but all slash commands only work in a server, not DMs",
  "[WARN-CMD]": "The requested slash command was not found",
  "[INFO-DEV]": "This command is in development. This should not be expected to work"
};

module.exports = {
  /**
   * @description Sends a message to the console
   * @param {String} message [REQUIRED] The message to send to the console
   * @param {String} source [REQUIRED] Source of the message (Error.stack)
   * @param {Client} client [REQUIRED] A logged-in Client to send the message
   * @returns {null} null
   * @example toConsole(`Hello, World!`, new Error().stack, client);
   * @example toConsole(`Published a ban`, new Error().stack, client);
   */
  toConsole: async (message, source, client) => {
    if(!message || !source || !client) return console.error(`One or more of the required parameters are missing.\n\n> message: ${message}\n> source: ${source}\n> client: ${client}`);
    const channel = await client.channels.cache.get(config.discord.devChannel);
    if(source.split("\n").length < 2) return console.error("[ERR] toConsole called but Error.stack was not used\n> Source: " + source);
    source = source.split("\n")[1].trim().substring(3).split("/").pop().replace(")", "");
    if(!channel) return console.warn("[WARN] toConsole called but bot cannot find config.discord.devChannel\n", message, "\n", source);

    await channel.send(`Incoming message from \`${source}\` at <t:${Math.floor(Date.now()/1000)}:F>`);
    const check = await channel.send({ embeds: [{
      title: "Message to Console",
      color: 0xDE2821,
      description: `${message}`,
      footer: {
        text: `Source: ${source} @ ${new Date().toLocaleTimeString()} ${new Date().toString().match(/GMT([+-]\d{2})(\d{2})/)[0]}`
      },
      timestamp: new Date()
    }] })
      .then(false)
      .catch(true); // Supress errors
    if(check) return console.error("[ERR] toConsole called but message failed to send");

    return null;
  },
  /**
   * @description Replies with a Embed to the Interaction
   * @param {Number} type 1- Sucessful, 2- Warning, 3- Error, 4- Information
   * @param {String} content The information to state
   * @param {String} expected The expected argument (If applicable)
   * @param {Interaction} interaction The Interaction object for responding
   * @param {Client} client Client object for logging
   * @param {Array<Boolean, Number>} remove Whether to delete the message and the specified timeout in seconds
   * @example interactionEmbed(1, "", `Removed ${removed} roles`, interaction, client, [false, 0])
   * @example interactionEmbed(3, `[ERR-UPRM]`, `Missing: \`Manage Messages\``, interaction, client, [true, 15])
   * @returns {null} 
   */
  interactionEmbed: async function(type, content, expected, interaction, client, remove) {
    if(!type || typeof content != "string" || expected === undefined || !interaction || !client || !remove || remove.length != 2) throw new SyntaxError(`One or more of the required parameters are missing in [interactionEmbed]\n\n> ${type}\n> ${content}\n> ${expected}\n> ${interaction}\n> ${client}`);
    if(!interaction.deferred) await interaction.deferReply();
    const embed = new EmbedBuilder();

    switch(type) {
    case 1:
      embed
        .setTitle("Success")
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL({ dynamic: true, size: 4096 }) })
        .setColor(0x7289DA)
        .setDescription(!errors[content] ? expected : `${errors[content]}\n> ${expected}`)
        .setFooter({ text: "The operation was completed successfully with no errors" })
        .setTimestamp();
  
      break;
    case 2:
      embed
        .setTitle("Warning")
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL({ dynamic: true, size: 4096 }) })
        .setColor(0xFFA500)
        .setDescription(!errors[content] ? expected : `${errors[content]}\n> ${expected}`)
        .setFooter({ text: "The operation was completed successfully with a minor error" })
        .setTimestamp();
  
      break;
    case 3:
      embed
        .setTitle("Error")
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL({ dynamic: true, size: 4096 }) })
        .setColor(0xFF0000)
        .setDescription(!errors[content] ? `I don't understand the error "${content}" but was expecting ${expected}. Please report this to the support server!` : `${errors[content]}\n> ${expected}`)
        .setFooter({ text: "The operation failed to complete due to an error" })
        .setTimestamp();
  
      break;
    case 4:
      embed
        .setTitle("Information")
        .setAuthor({ name: interaction.user.username, iconURL: interaction.user.avatarURL({ dynamic: true, size: 4096 }) })
        .setColor(0x7289DA)
        .setDescription(!errors[content] ? expected : `${errors[content]}\n> ${expected}`)
        .setFooter({ text: "The operation is pending completion" })
        .setTimestamp();
  
      break;
    }
    await interaction.editReply({ content: "​", embeds: [embed] });
    if(remove[0]) setTimeout(() => { interaction.deleteReply(); }, remove[1]*1000);
    return null;
  },
  /**
     * Sends buttons to a user and awaits the response
     * @param {Interaction} interaction Interaction object
     * @param {Number} time Seconds for which the buttons are valid
     * @param {Array<ButtonBuilder>} buttons The buttons to place on the message
     * @param {String|null} content The content to display, can be blank
     * @param {Boolean} remove Delete the message after the time expires
     * @example awaitButtons(interaction, 15, [button1, button2], `Select a button`, true);
     * @returns {ButtonBuilder|null} The button the user clicked or null if no button was clicked
     */
  awaitButtons: async function (interaction, time, buttons, content, remove) {
    if(!interaction || !time || !buttons || remove === null) return new SyntaxError(`One of the following values is not fulfilled:\n> interaction: ${interaction}\n> time: ${time}\n> buttons: ${buttons}\n> remove: ${remove}`);
    content = content ?? "Please select an option";
    
    // Create a filter
    const filter = i => {
      return i.user.id === interaction.user.id;
    };
    // Convert the time to milliseconds
    time *= 1000;
    // Create a ActionRow and add the buttons
    const row = new ActionRow();
    row.addComponents(buttons);
    // Send a follow-up message with the buttons and await a response
    const message = await interaction.followUp({ content: content, components: [row] });
    const res = await message
      .awaitMessageComponent({ filter, componentType: "BUTTON", time: time, errors: ["time"] })
      .catch(() => { return null; });
    // Disable the buttons on row
    for(const button of row.components) {
      button.setDisabled(true);
    }
    // Step 5: Cleanup
    setTimeout(() => {
      if(message != undefined && !message.deleted && remove && res != null) message.delete();
    }, 1500);
    await message.edit({ content: content, components: [] });
    return res;
  },
  /**
   * @param {String} time 
   * @returns {Number|"NaN"}
   */
  parseTime: function (time) {
    let duration = 0;
    if(!time.match(/[1-9]{1,3}[dhms]/g)) return "NaN";

    for(const period of time.match(/[1-9]{1,3}[dhms]/g)) {
      const [amount, unit] = period.match(/^(\d+)([dhms])$/).slice(1);
      duration += unit === "d" ? amount * 24 * 60 * 60 : unit === "h" ? amount * 60 * 60 : unit === "m" ? amount * 60 : amount;
    }

    return duration;
  }
};
# Mochi
A custom bot with code made public for anyone to peek in and see how it works

**Table of Contents**
1. [Installing](#installing)
    - [Prerequites](#preresquites)
    - [Installation](#installation)
2. [Commands](#commands)
3. [License](#license)
4. [Credits](#credits)

## Installing ##
### Preresquites ###
Before installing the project, you will need the following. Some have been marked as optional, in which case, they are optional and not required, but recommended.

* Internet connection
* Node.js v16.11.1 or higher
* NPM v8.0.0 or higher
* MySQL v8.0.28
* Git CLI

**Important!** The `git` commands used are adapted for git version 2.32.0 (Apple Git-132). This may vary across platforms or new versions.

### Installation ###
To install the bot's code, please use the following commands.

1. `git clone https://github.com/Coder-Tavi/Mochi`
2. `cd Mochi`
3. `npm install`

Once done, you need to create a `config.json` file. A template is provided below as to show what the bot is expecting
```json
{
  "bot": {
    "applicationId": "",
    "guildId": "",
    "token": ""
  },
  "discord": {
    "devRole": "",
    "devChannel": "",
    "logChannel": ""
  },
  "mysql": {
    "host": "",
    "user": "",
    "password": "",
    "database": ""
  }
}
```

When you are done with that, you can run the bot using the following command:
* `node index.js`

To validate your code against the ESLint configuration, please use the following command:
* `npx eslint ./`

## Commands ##
Since this bot operates on Discord's slash commands, all commands can be viewed by typing `/` into the Discord chat bar. You will see a list of commands appear for the different bots. Scroll until you see the bot's. All available commands will be listed there.

## License ##
Coder-Tavi/Mochi is licensed under the GNU General Public License v3.0. You can find more details about the license and where to find it in the file titled "LICENSE" in the primary directory.

## Credits ##
This bot was made possible thanks to the following people:
- [Tavi](https://github.com/Coder-Tavi) - Developer
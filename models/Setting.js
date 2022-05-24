const { DataTypes } = require("sequelize");

module.exports.import = (sequelize) => sequelize.define("Setting", {
  guildId: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  autoVerify: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  addRoles: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  removeRoles: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  rolesRequired: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  introChannel: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  verificationChannel: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  verificationPhrase: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  welcomeMessage: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  welcomeChannel: {
    type: DataTypes.TEXT,
    allowNull: false
  }
});
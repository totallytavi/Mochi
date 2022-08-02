const { DataTypes } = require("sequelize");

module.exports.import = (sequelize) => sequelize.define("Setting", {
  guildId: {
    type: DataTypes.STRING,
    primaryKey: true
  },
  verification_toggle: {
    type: DataTypes.BOOLEAN,
    allowNull: false
  },
  verification_password: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  verification_welcome: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  channels_verification: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  channels_introduction: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  roles_amount: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  roles_add: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  roles_remove: {
    type: DataTypes.TEXT,
    allowNull: false
  },
});
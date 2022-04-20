const { DataTypes } = require("sequelize");

module.exports.import = (sequelize) => sequelize.define("Punishment", {
  caseId: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
    allowNull: false
  },
  userId: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  modId: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  // Valid values: WARN, MUTE, KICK, BAN
  type: {
    type: DataTypes.TEXT,
    allowNull: false,
  },
  endsAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  active: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  deleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING,
    allownull: false,
  }
});
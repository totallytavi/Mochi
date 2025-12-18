const { DataTypes, Sequelize } = require("sequelize");

module.exports.import = (sequelize) => {
  sequelize.define("Collar", {
    collared: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    owner: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    guild: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    collaredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('now')
    },
  });
};
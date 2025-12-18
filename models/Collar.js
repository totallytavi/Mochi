const { DataTypes, Sequelize } = require("sequelize");

module.exports.import = (sequelize) => {
  sequelize.define("Collar", {
    collared: {
      type: DataTypes.TEXT(21),
      allowNull: false
    },
    owner: {
      type: DataTypes.TEXT(21),
      allowNull: false
    },
    guild: {
      type: DataTypes.TEXT(21),
      allowNull: false
    },
    collaredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: Sequelize.fn('now')
    },
  });
};
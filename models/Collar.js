const { DataTypes } = require("sequelize");

module.exports.import = (sequelize) => {
  sequelize.define("Collar", {
    collared: {
      type: DataTypes.STRING,
      primaryKey: true,
    },
    owner: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    collaredAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });
};
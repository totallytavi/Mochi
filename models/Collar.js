import { DataTypes, Sequelize } from "sequelize";

const _import = (sequelize) => {
  sequelize.define("Collar", {
    collarId: {
      type: DataTypes.UUID,
      allowNull: false,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
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
    collarType: {
      type: DataTypes.TEXT('tiny'),
      allowNull: false
      // Acceptable values: dog, cat, standard
    }
  });
};
export { _import as import };

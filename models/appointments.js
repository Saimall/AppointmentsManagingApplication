"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class appointments extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      appointments.belongsTo(models.users, {
        foreignKey: "userId",
        // define association here
      });
    }

    static addevent({ title, start, end, userId }) {
      return this.create({
        title: title,
        start: start,
        end: end,
        userId,
      });
    }

    static deleteevent(id, userid) {
      return this.destroy({
        where: {
          id,
          userid,
        },
      });
    }

    static getevents(userId) {
      return this.findAll({
        where: {
          userId,
        },

        order: [["id", "ASC"]],
      });
    }
    static findone(start, end) {
      return this.findOne({
        where: {
          start,
          end,
        },
      });
    }

    static async remove(id, userId) {
      return this.destroy({
        where: {
          id,
          userId,
        },
      });
    }
  }

  appointments.init(
    {
      title: DataTypes.STRING,
      start: DataTypes.TIME,
      end: DataTypes.TIME,
    },
    {
      sequelize,
      modelName: "appointments",
    }
  );
  return appointments;
};

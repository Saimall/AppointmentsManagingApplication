"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("appointments", "userId", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addConstraint("appointments", {
      fields: ["userId"],
      type: "foreign key",
      onDelete: "CASCADE",
      references: {
        table: "users",
        field: "id",
      },
    });
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("appointments", "userId");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};

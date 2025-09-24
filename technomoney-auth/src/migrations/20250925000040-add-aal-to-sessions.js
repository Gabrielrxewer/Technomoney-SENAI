"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("sessions", "aal", {
      type: Sequelize.STRING(16),
      allowNull: false,
      defaultValue: "aal1",
    });
    await queryInterface.sequelize.query(
      "UPDATE \"sessions\" SET \"aal\" = 'aal1' WHERE \"aal\" IS NULL"
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn("sessions", "aal");
  },
};

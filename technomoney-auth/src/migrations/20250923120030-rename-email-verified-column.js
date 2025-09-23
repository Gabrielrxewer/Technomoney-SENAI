"use strict";

module.exports = {
  async up(queryInterface) {
    await queryInterface.renameColumn(
      "users",
      "is_email_verified",
      "email_verified"
    );
  },

  async down(queryInterface) {
    await queryInterface.renameColumn(
      "users",
      "email_verified",
      "is_email_verified"
    );
  },
};

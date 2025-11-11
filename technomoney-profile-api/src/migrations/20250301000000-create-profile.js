"use strict";

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable("profiles", {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.literal("gen_random_uuid()"),
        allowNull: false,
        primaryKey: true,
      },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: "users",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      first_name: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      last_name: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      birth_date: {
        type: Sequelize.DATEONLY,
        allowNull: true,
      },
      phone_number: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      profession: {
        type: Sequelize.STRING(150),
        allowNull: true,
      },
      biography: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      address_line1: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      address_line2: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      city: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      state: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      postal_code: {
        type: Sequelize.STRING(30),
        allowNull: true,
      },
      country: {
        type: Sequelize.STRING(120),
        allowNull: true,
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
      },
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable("profiles");
  },
};

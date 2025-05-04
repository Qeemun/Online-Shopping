'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('adminActionLogs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      accountId: { 
        type: Sequelize.INTEGER, 
        allowNull: false 
      },
      role: { 
        type: Sequelize.ENUM('admin', 'sales'), 
        allowNull: false 
      },
      action: { 
        type: Sequelize.TEXT 
      },
      path: { 
        type: Sequelize.STRING(255) 
      },
      method: { 
        type: Sequelize.STRING(10) 
      },
      ipAddress: { 
        type: Sequelize.STRING(45) 
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('adminActionLogs');
  }
};
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('userSessionLogs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: { 
        type: Sequelize.INTEGER, 
        allowNull: false 
      },
      action: { 
        type: Sequelize.ENUM('login', 'logout'), 
        allowNull: false 
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
    
    // 添加外键约束
    await queryInterface.addConstraint('userSessionLogs', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'fk_userSessionLogs_userId',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('userSessionLogs');
  }
};
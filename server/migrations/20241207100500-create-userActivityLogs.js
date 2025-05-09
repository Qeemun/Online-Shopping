'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ActivityLogs', {
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
      productId: { 
        type: Sequelize.INTEGER, 
        allowNull: true 
      },
      action: { 
        type: Sequelize.ENUM('view', 'purchase', 'stay'), 
        allowNull: false 
      },
      durationSeconds: { 
        type: Sequelize.INTEGER 
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
    await queryInterface.addConstraint('ActivityLogs', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'fk_ActivityLogs_userId',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    
    await queryInterface.addConstraint('ActivityLogs', {
      fields: ['productId'],
      type: 'foreign key',
      name: 'fk_ActivityLogs_productId',
      references: {
        table: 'products',
        field: 'id'
      },
      onDelete: 'SET NULL',
      onUpdate: 'CASCADE'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ActivityLogs');
  }
};
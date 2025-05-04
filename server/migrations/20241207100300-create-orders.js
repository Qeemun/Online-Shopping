'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('orders', {
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
      totalAmount: { 
        type: Sequelize.DECIMAL(10,2), 
        allowNull: false 
      },
      status: { 
        type: Sequelize.ENUM('pending', 'paid', 'shipped', 'completed', 'cancelled'), 
        defaultValue: 'pending' 
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
    await queryInterface.addConstraint('orders', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'fk_orders_userId',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('orders');
  }
};
'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('orderItems', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      orderId: { 
        type: Sequelize.INTEGER, 
        allowNull: false 
      },
      productId: { 
        type: Sequelize.INTEGER, 
        allowNull: false 
      },
      quantity: { 
        type: Sequelize.INTEGER, 
        allowNull: false 
      },
      price: { 
        type: Sequelize.DECIMAL(10,2), 
        allowNull: false 
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
    await queryInterface.addConstraint('orderItems', {
      fields: ['orderId'],
      type: 'foreign key',
      name: 'fk_orderItems_orderId',
      references: {
        table: 'orders',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    
    await queryInterface.addConstraint('orderItems', {
      fields: ['productId'],
      type: 'foreign key',
      name: 'fk_orderItems_productId',
      references: {
        table: 'products',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('orderItems');
  }
};
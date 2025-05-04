'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('cartItems', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: { type: Sequelize.INTEGER, allowNull: false },
      productId: { type: Sequelize.INTEGER, allowNull: false },
      quantity: { type: Sequelize.INTEGER, allowNull: false },
      addedAt: { 
        type: Sequelize.DATE, 
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP') 
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
    
    // 添加唯一约束
    await queryInterface.addConstraint('cartItems', {
      fields: ['userId', 'productId'],
      type: 'unique',
      name: 'unique_user_product'
    });
    
    // 添加外键约束
    await queryInterface.addConstraint('cartItems', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'fk_cartItems_userId',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    
    await queryInterface.addConstraint('cartItems', {
      fields: ['productId'],
      type: 'foreign key',
      name: 'fk_cartItems_productId',
      references: {
        table: 'products',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('cartItems');
  }
};
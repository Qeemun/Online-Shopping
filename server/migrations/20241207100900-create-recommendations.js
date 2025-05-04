'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('recommendations', {
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
        allowNull: false 
      },
      score: { 
        type: Sequelize.DECIMAL(5, 2) 
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
    await queryInterface.addConstraint('recommendations', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'fk_recommendations_userId',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
    
    await queryInterface.addConstraint('recommendations', {
      fields: ['productId'],
      type: 'foreign key',
      name: 'fk_recommendations_productId',
      references: {
        table: 'products',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('recommendations');
  }
};
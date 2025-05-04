'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('userProfiles', {
      userId: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        allowNull: false
      },
      region: { 
        type: Sequelize.STRING(50) 
      },
      totalSpent: { 
        type: Sequelize.DECIMAL(10, 2) 
      },
      favoriteCategory: { 
        type: Sequelize.STRING(50) 
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
    await queryInterface.addConstraint('userProfiles', {
      fields: ['userId'],
      type: 'foreign key',
      name: 'fk_userProfiles_userId',
      references: {
        table: 'users',
        field: 'id'
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE'
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('userProfiles');
  }
};
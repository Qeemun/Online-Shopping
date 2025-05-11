'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 检查 ProductViewLog 表是否存在，如果不存在则创建
    const tableExists = await queryInterface.showAllTables().then(tables => {
      return tables.includes('ProductViewLogs');
    });

    if (!tableExists) {
      await queryInterface.createTable('ProductViewLogs', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        productId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Products',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        durationSeconds: {
          type: Sequelize.INTEGER,
          allowNull: false
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE
        }
      });
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ProductViewLogs');
  }
};

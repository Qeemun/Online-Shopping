'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 添加status列到products表
    await queryInterface.addColumn('products', 'status', {
      type: Sequelize.ENUM('active', 'discontinued'),
      defaultValue: 'active',
      allowNull: false,
      after: 'category' // 放在category字段后面
    });

    // 将所有现有产品的状态设为"active"
    await queryInterface.sequelize.query(`
      UPDATE products SET status = 'active'
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // 删除status列
    await queryInterface.removeColumn('products', 'status');
  }
};

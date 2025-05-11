'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 添加 isActive 列到 users 表
    await queryInterface.addColumn('users', 'isActive', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      after: 'role'
    });
  },

  async down(queryInterface, Sequelize) {
    // 删除列
    await queryInterface.removeColumn('users', 'isActive');
  }
};

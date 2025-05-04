'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('Users', [
      {
        username: 'testuser1',
        email: 'testuser1@example.com',
        password: 'hashed_password_1', // 可以根据需要替换为加密后的密码
        role: 'customer',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        username: 'testuser2',
        email: 'testuser2@example.com',
        password: 'hashed_password_2',
        role: 'sales',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        username: 'Qeemun',
        email: '3388053369@qq.com',
        password: 'testpassword', 
        role: 'customer',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Users', null, {});
  }
};
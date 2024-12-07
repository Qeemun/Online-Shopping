'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.bulkInsert('Products', [
      {
        name: 'Test Product 1',
        description: 'This is a test product 1.',
        price: 100.0,
        stock: 50,
        imageUrl: 'https://via.placeholder.com/150',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        name: 'Test Product 2',
        description: 'This is a test product 2.',
        price: 200.0,
        stock: 30,
        imageUrl: 'https://via.placeholder.com/150',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ], {});
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.bulkDelete('Products', null, {});
  }
};

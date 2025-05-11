'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // 1. 获取所有唯一的类别名
    const [categories] = await queryInterface.sequelize.query(
      'SELECT DISTINCT category FROM products WHERE category IS NOT NULL;'
    );
    
    // 2. 向 categories 表中插入唯一类别
    if (categories.length > 0) {
      const categoryData = categories.map(item => ({
        name: item.category,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      await queryInterface.bulkInsert('categories', categoryData);
    }

    // 3. 创建一个视图或函数来映射 category 和 categoryId
    await queryInterface.sequelize.query(`
      CREATE OR REPLACE VIEW product_with_category_id AS
      SELECT p.*, c.id as categoryId
      FROM products p
      LEFT JOIN categories c ON p.category = c.name;
    `);
  },

  down: async (queryInterface, Sequelize) => {
    // 删除视图
    await queryInterface.sequelize.query('DROP VIEW IF EXISTS product_with_category_id;');
    
    // 删除所有类别数据
    await queryInterface.bulkDelete('categories', null, {});
  }
};

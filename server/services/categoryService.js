'use strict';

const { Category, Product, sequelize } = require('../models');

class CategoryService {
  // 获取所有类别
  static async getAllCategories() {
    return await Category.findAll();
  }

  // 根据名称获取类别ID
  static async getCategoryIdByName(categoryName) {
    if (!categoryName) return null;
    
    const category = await Category.findOne({
      where: { name: categoryName }
    });
    
    return category ? category.id : null;
  }

  // 根据ID获取类别名称
  static async getCategoryNameById(categoryId) {
    if (!categoryId) return null;
    
    const category = await Category.findByPk(categoryId);
    return category ? category.name : null;
  }

  // 获取带有 categoryId 的产品
  static async getProductsWithCategoryId() {
    const [products] = await sequelize.query(`
      SELECT p.*, c.id as categoryId
      FROM products p
      LEFT JOIN categories c ON p.category = c.name
    `);
    
    return products;
  }

  // 根据 categoryId 获取产品
  static async getProductsByCategoryId(categoryId) {
    const category = await Category.findByPk(categoryId);
    if (!category) return [];
    
    const products = await Product.findAll({
      where: { category: category.name }
    });
    
    return products.map(product => ({
      ...product.toJSON(),
      categoryId
    }));
  }
}

module.exports = CategoryService;

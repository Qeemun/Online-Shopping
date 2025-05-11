'use strict';

const CategoryService = require('./categoryService');

class CategoryHelper {
  // 给产品数据添加 categoryId 字段
  static async enrichProductsWithCategoryId(products) {
    if (!products || products.length === 0) return [];

    const categories = await CategoryService.getAllCategories();
    const categoryMap = {};
    
    // 创建类别名称到ID的映射
    categories.forEach(category => {
      categoryMap[category.name] = category.id;
    });
    
    // 处理可能的数组或对象情况，确保返回的是和输入相同类型的数据
    if (Array.isArray(products)) {
      // 为每个产品添加 categoryId
      return products.map(product => {
        // 如果产品是 Sequelize 实例，需要使用 toJSON() 转换
        const productData = product.toJSON ? product.toJSON() : {...product};
        return {
          ...productData,
          categoryId: productData.category ? categoryMap[productData.category] : null
        };
      });
    } else {
      // 单个产品对象情况
      const productData = products.toJSON ? products.toJSON() : {...products};
      return {
        ...productData,
        categoryId: productData.category ? categoryMap[productData.category] : null
      };
    }
  }
  
  // 根据 categoryId 获取 category 名称
  static async getCategoryName(categoryId) {
    return await CategoryService.getCategoryNameById(categoryId);
  }
  
  // 根据 category 名称获取 categoryId
  static async getCategoryId(categoryName) {
    return await CategoryService.getCategoryIdByName(categoryName);
  }
  
  // 为产品添加 categoryId 字段的简化方法 (适用于单个产品)
  static async addCategoryIdToProduct(product) {
    if (!product) return null;
    
    const categoryId = await this.getCategoryId(product.category);
    return {
      ...product,
      categoryId
    };
  }
}

module.exports = CategoryHelper;

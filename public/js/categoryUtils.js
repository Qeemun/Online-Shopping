/**
 * 类别工具类
 * 用于处理产品类别和类别ID的映射关系
 */
class CategoryUtils {
  constructor() {
    this.categoryMap = {};
    this.categoryIdMap = {};
    this.initialized = false;
    this.initializing = false;
  }

  /**
   * 初始化类别数据
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized || this.initializing) return;
    
    this.initializing = true;
    try {
      await this.fetchCategories();
      this.initialized = true;
    } catch (error) {
      console.error('初始化类别数据失败:', error);
    } finally {
      this.initializing = false;
    }
  }
  /**
   * 获取所有类别数据
   * @returns {Promise<void>}
   */
  async fetchCategories() {
    try {
      const response = await fetch('http://localhost:3000/api/products/categories/all');
      if (!response.ok) {
        throw new Error(`获取类别失败: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success) {
        // 优先使用服务器返回的完整类别数据
        if (data.categoriesData && Array.isArray(data.categoriesData)) {
          this.buildCategoryMaps(data.categoriesData);
        } 
        // 如果没有完整数据，则使用类别名称列表构建映射
        else if (data.categories && Array.isArray(data.categories)) {
          const categories = data.categories.map((name, index) => ({
            id: index + 1, // 临时ID，实际应该使用服务器返回的ID
            name
          }));
          this.buildCategoryMaps(categories);
        }
      }
    } catch (error) {
      console.error('获取类别数据失败:', error);
      // 使用备选方案：从产品页获取类别
      await this.fetchCategoriesFromProducts();
    }
  }

  /**
   * 从产品列表获取类别数据（备选方案）
   * @returns {Promise<void>}
   */
  async fetchCategoriesFromProducts() {
    try {
      const response = await fetch('/api/products?limit=1000');
      if (!response.ok) {
        throw new Error(`获取产品失败: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.success && data.products) {
        // 提取唯一类别
        const uniqueCategories = [...new Set(data.products.map(p => p.category))];
        
        // 构建临时类别数据
        const categories = uniqueCategories.map((name, index) => ({
          id: index + 1,
          name
        }));
        
        this.buildCategoryMaps(categories);
      }
    } catch (error) {
      console.error('从产品获取类别数据失败:', error);
    }
  }

  /**
   * 构建类别映射
   * @param {Array} categories 类别数组
   */
  buildCategoryMaps(categories) {
    this.categoryMap = {}; // 由名称到ID的映射
    this.categoryIdMap = {}; // 由ID到名称的映射

    categories.forEach(category => {
      this.categoryMap[category.name] = category.id;
      this.categoryIdMap[category.id] = category.name;
    });
  }

  /**
   * 根据类别名称获取类别ID
   * @param {string} categoryName 类别名称
   * @returns {number|null} 类别ID
   */
  getCategoryId(categoryName) {
    if (!this.initialized) {
      console.warn('类别工具未初始化，尝试进行初始化');
      this.initialize();
      return null;
    }
    return this.categoryMap[categoryName] || null;
  }

  /**
   * 根据类别ID获取类别名称
   * @param {number} categoryId 类别ID
   * @returns {string|null} 类别名称
   */
  getCategoryName(categoryId) {
    if (!this.initialized) {
      console.warn('类别工具未初始化，尝试进行初始化');
      this.initialize();
      return null;
    }
    return this.categoryIdMap[categoryId] || null;
  }

  /**
   * 为产品数据添加类别ID
   * @param {Object|Array} products 产品数据或数组
   * @returns {Object|Array} 添加了类别ID的产品数据
   */
  enrichProductsWithCategoryId(products) {
    if (!this.initialized) {
      console.warn('类别工具未初始化，尝试进行初始化');
      this.initialize();
      return products;
    }

    if (Array.isArray(products)) {
      return products.map(product => ({
        ...product,
        categoryId: this.categoryMap[product.category] || null
      }));
    } else if (products && typeof products === 'object') {
      return {
        ...products,
        categoryId: this.categoryMap[products.category] || null
      };
    }

    return products;
  }
}

// 创建全局实例
const categoryUtils = new CategoryUtils();
// 立即初始化
categoryUtils.initialize();

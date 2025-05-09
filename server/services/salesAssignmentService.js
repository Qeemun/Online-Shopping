/**
 * 销售分配服务
 * 处理销售人员与产品关联的业务逻辑
 */
const db = require('../models');
const { Op } = require('sequelize');

class SalesAssignmentService {
  /**
   * 检查销售人员是否负责指定的产品
   * @param {number} salesId - 销售人员ID
   * @param {number} productId - 产品ID
   * @returns {Promise<boolean>} - 返回是否负责该产品
   */
  async isProductAssignedToSales(salesId, productId) {
    const assignment = await db.SalesProductAssignment.findOne({
      where: {
        salesId: salesId,
        productId: productId
      }
    });
    
    return !!assignment;
  }
  
  /**
   * 获取负责指定产品的销售人员
   * @param {number} productId - 产品ID
   * @returns {Promise<Array>} - 返回负责该产品的销售人员列表
   */
  async getSalesStaffForProduct(productId) {
    const assignments = await db.SalesProductAssignment.findAll({
      where: { productId: productId },
      include: [
        {
          model: db.User,
          as: 'salesStaff',
          attributes: ['id', 'username', 'email'],
          where: { isActive: true, role: 'sales' }
        }
      ]
    });
    
    return assignments.map(a => a.salesStaff);
  }
  
  /**
   * 获取销售人员负责的所有产品ID
   * @param {number} salesId - 销售人员ID
   * @returns {Promise<Array>} - 返回产品ID数组
   */
  async getAssignedProductIds(salesId) {
    const assignments = await db.SalesProductAssignment.findAll({
      where: { salesId: salesId },
      attributes: ['productId']
    });
    
    return assignments.map(a => a.productId);
  }
  
  /**
   * 获取销售人员负责的所有产品的类别ID
   * @param {number} salesId - 销售人员ID
   * @returns {Promise<Array>} - 返回唯一的类别ID数组
   */
  async getAssignedCategoryIds(salesId) {
    const productIds = await this.getAssignedProductIds(salesId);
    
    if (productIds.length === 0) {
      return [];
    }
    
    const products = await db.Product.findAll({
      where: { id: { [Op.in]: productIds } },
      attributes: ['categoryId']
    });
    
    // 提取唯一的类别ID
    const categoryIds = [...new Set(products.map(p => p.categoryId))];
    
    return categoryIds;
  }
  
  /**
   * 按类别分配给销售人员
   * @param {number} salesId - 销售人员ID
   * @param {Array} categoryIds - 类别ID数组
   * @returns {Promise<Object>} - 返回分配结果
   */
  async assignProductsByCategory(salesId, categoryIds) {
    if (!Array.isArray(categoryIds) || categoryIds.length === 0) {
      throw new Error('类别ID列表不能为空');
    }
    
    // 查询这些类别下的所有产品
    const products = await db.Product.findAll({
      where: { categoryId: { [Op.in]: categoryIds } },
      attributes: ['id']
    });
    
    const productIds = products.map(p => p.id);
    
    if (productIds.length === 0) {
      return { assigned: 0, message: '没有找到产品可分配' };
    }
    
    // 查询已经分配的产品
    const existingAssignments = await db.SalesProductAssignment.findAll({
      where: {
        salesId: salesId,
        productId: { [Op.in]: productIds }
      },
      attributes: ['productId']
    });
    
    const existingProductIds = existingAssignments.map(a => a.productId);
    
    // 过滤出新产品
    const newProductIds = productIds.filter(id => !existingProductIds.includes(id));
    
    if (newProductIds.length === 0) {
      return { 
        assigned: 0, 
        alreadyAssigned: existingProductIds.length,
        message: '所有产品已经分配给该销售人员' 
      };
    }
    
    // 创建新分配
    const assignments = newProductIds.map(productId => ({
      salesId: salesId,
      productId: productId
    }));
    
    await db.SalesProductAssignment.bulkCreate(assignments);
    
    return {
      assigned: newProductIds.length,
      alreadyAssigned: existingProductIds.length,
      message: `成功分配 ${newProductIds.length} 个产品`
    };
  }
  
  /**
   * 获取类别下的所有产品的销售和浏览数据
   * @param {number} salesId - 销售人员ID 
   * @param {number} categoryId - 类别ID
   * @param {Date} startDate - 开始日期
   * @param {Date} endDate - 结束日期
   * @returns {Promise<Object>} - 返回销售和浏览数据
   */
  async getCategoryPerformanceData(salesId, categoryId, startDate, endDate) {
    // 查询销售人员负责的该类别下的所有产品
    const assignedProducts = await db.SalesProductAssignment.findAll({
      where: { salesId: salesId },
      include: [
        {
          model: db.Product,
          as: 'product',
          where: { categoryId: categoryId },
          attributes: ['id', 'name', 'price', 'stock']
        }
      ]
    });
    
    if (assignedProducts.length === 0) {
      return {
        products: [],
        sales: {
          totalOrders: 0,
          totalQuantity: 0,
          totalRevenue: 0
        },
        views: {
          totalViews: 0,
          uniqueViewers: 0,
          avgDuration: 0
        }
      };
    }
    
    const productIds = assignedProducts.map(ap => ap.product.id);
    
    // 构建日期查询条件
    const dateFilter = {};
    if (startDate || endDate) {
      dateFilter.createdAt = {};
      
      if (startDate) {
        dateFilter.createdAt[Op.gte] = new Date(startDate);
      }
      
      if (endDate) {
        dateFilter.createdAt[Op.lte] = new Date(endDate);
      }
    }
    
    // 查询销售数据
    const orderItems = await db.OrderItem.findAll({
      where: {
        productId: { [Op.in]: productIds },
        ...dateFilter
      },
      include: [
        {
          model: db.Order,
          as: 'order',
          where: {
            status: { [Op.in]: ['completed', 'shipped', 'delivered'] }
          },
          attributes: ['id', 'userId', 'createdAt', 'status']
        }
      ]
    });
    
    // 查询浏览数据
    const browseFilter = {
      productId: { [Op.in]: productIds }
    };
    
    if (startDate || endDate) {
      browseFilter.startTime = {};
      
      if (startDate) {
        browseFilter.startTime[Op.gte] = new Date(startDate);
      }
      
      if (endDate) {
        browseFilter.startTime[Op.lte] = new Date(endDate);
      }
    }
    
    const browseLogs = await db.BrowseLog.findAll({
      where: browseFilter
    });
    
    // 计算销售统计数据
    const totalOrders = new Set(orderItems.map(item => item.orderId)).size;
    const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
    const totalRevenue = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // 计算浏览统计数据
    const totalViews = browseLogs.length;
    const uniqueViewers = new Set(browseLogs.map(log => log.userId)).size;
    const validDurations = browseLogs
      .filter(log => log.duration !== null && log.duration > 0)
      .map(log => log.duration);
    const avgDuration = validDurations.length > 0 ?
      validDurations.reduce((sum, duration) => sum + duration, 0) / validDurations.length : 0;
    
    // 按产品计算详细数据
    const productDetails = productIds.map(productId => {
      const product = assignedProducts.find(ap => ap.product.id === productId).product;
      const productOrders = orderItems.filter(item => item.productId === productId);
      const productViews = browseLogs.filter(log => log.productId === productId);
      
      const salesQuantity = productOrders.reduce((sum, item) => sum + item.quantity, 0);
      const salesRevenue = productOrders.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      const viewsCount = productViews.length;
      const uniqueProductViewers = new Set(productViews.map(log => log.userId)).size;
      
      return {
        productId,
        productName: product.name,
        price: product.price,
        stock: product.stock,
        sales: {
          quantity: salesQuantity,
          revenue: salesRevenue,
          orders: new Set(productOrders.map(item => item.orderId)).size
        },
        views: {
          count: viewsCount,
          uniqueViewers: uniqueProductViewers
        }
      };
    });
    
    return {
      products: productDetails,
      sales: {
        totalOrders,
        totalQuantity,
        totalRevenue
      },
      views: {
        totalViews,
        uniqueViewers,
        avgDuration
      }
    };
  }
}

module.exports = new SalesAssignmentService();
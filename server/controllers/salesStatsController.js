const db = require('../models');
const { Op } = require('sequelize');

/**
 * 销售状态与业绩统计控制器
 * 提供销售数据分析和统计功能
 */
class SalesStatsController {
  /**
   * 获取特定商品类别的销售状态
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getCategoryPerformance(req, res) {
    try {
      const { categoryId } = req.params;
      const { startDate, endDate } = req.query;
      
      // 构建日期查询条件
      const dateFilter = {};
      if (startDate && endDate) {
        dateFilter.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      } else if (startDate) {
        dateFilter.createdAt = { [Op.gte]: new Date(startDate) };
      } else if (endDate) {
        dateFilter.createdAt = { [Op.lte]: new Date(endDate) };
      }
      
      // 获取该类别下的所有产品
      const products = await db.Product.findAll({
        where: { categoryId: categoryId },
        attributes: ['id', 'name', 'price', 'stock']
      });
      
      const productIds = products.map(product => product.id);
      
      // 获取这些产品的销售数据
      const orderItems = await db.OrderItem.findAll({
        where: {
          productId: { [Op.in]: productIds },
          ...dateFilter
        },
        include: [
          {
            model: db.Order,
            as: 'order',
            attributes: ['id', 'createdAt', 'status']
          }
        ]
      });
      
      // 计算销售统计数据
      const salesData = productIds.map(productId => {
        const productItems = orderItems.filter(item => item.productId === productId);
        const totalQuantitySold = productItems.reduce((sum, item) => sum + item.quantity, 0);
        const totalRevenue = productItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        const product = products.find(p => p.id === productId);
        
        return {
          productId: productId,
          productName: product.name,
          currentStock: product.stock,
          quantitySold: totalQuantitySold,
          revenue: totalRevenue,
          averagePrice: totalQuantitySold > 0 ? (totalRevenue / totalQuantitySold) : product.price
        };
      });
      
      // 计算类别总体统计数据
      const categorySummary = {
        categoryId: parseInt(categoryId),
        totalProducts: products.length,
        totalSales: salesData.reduce((sum, item) => sum + item.quantitySold, 0),
        totalRevenue: salesData.reduce((sum, item) => sum + item.revenue, 0),
        averageProductPrice: products.reduce((sum, product) => sum + product.price, 0) / products.length,
        lowStockProducts: products.filter(product => product.stock < 10).length
      };
      
      res.status(200).json({
        success: true,
        data: {
          summary: categorySummary,
          products: salesData
        }
      });
    } catch (error) {
      console.error('Error getting category performance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve category performance data',
        error: error.message
      });
    }
  }

  /**
   * 获取销售人员业绩报表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象 
   */
  async getSalesStaffPerformance(req, res) {
    try {
      const { salesId } = req.params;
      const { startDate, endDate } = req.query;
      
      // 验证销售人员身份
      const salesUser = await db.User.findOne({
        where: { 
          id: salesId,
          role: 'sales'
        }
      });
      
      if (!salesUser) {
        return res.status(404).json({
          success: false,
          message: 'Sales staff not found'
        });
      }
      
      // 构建日期查询条件
      const dateFilter = {};
      if (startDate && endDate) {
        dateFilter.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      } else if (startDate) {
        dateFilter.createdAt = { [Op.gte]: new Date(startDate) };
      } else if (endDate) {
        dateFilter.createdAt = { [Op.lte]: new Date(endDate) };
      }
      
      // 获取该销售人员负责的产品
      const assignedProducts = await db.SalesProductAssignment.findAll({
        where: { salesId: salesId },
        include: [
          {
            model: db.Product,
            as: 'product',
            attributes: ['id', 'name', 'categoryId', 'price', 'stock']
          }
        ]
      });
      
      const productIds = assignedProducts.map(assignment => assignment.product.id);
      
      // 获取这些产品的订单数据
      const orderItems = await db.OrderItem.findAll({
        where: {
          productId: { [Op.in]: productIds },
          ...dateFilter
        },
        include: [
          {
            model: db.Order,
            as: 'order',
            attributes: ['id', 'userId', 'createdAt', 'status', 'totalAmount']
          }
        ]
      });
      
      // 按产品分组的销售数据
      const productPerformance = productIds.map(productId => {
        const items = orderItems.filter(item => item.productId === productId);
        const assignment = assignedProducts.find(a => a.product.id === productId);
        
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        const totalRevenue = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        return {
          productId,
          productName: assignment.product.name,
          quantitySold: totalQuantity,
          revenue: totalRevenue,
          currentStock: assignment.product.stock,
          orderCount: new Set(items.map(item => item.orderId)).size
        };
      });
      
      // 总体业绩统计
      const totalPerformance = {
        salesId: parseInt(salesId),
        salesName: salesUser.username,
        assignedProducts: productIds.length,
        totalQuantitySold: productPerformance.reduce((sum, p) => sum + p.quantitySold, 0),
        totalRevenue: productPerformance.reduce((sum, p) => sum + p.revenue, 0),
        totalOrders: new Set(orderItems.map(item => item.orderId)).size,
        averageOrderValue: orderItems.length > 0 ? 
          (productPerformance.reduce((sum, p) => sum + p.revenue, 0) / 
           new Set(orderItems.map(item => item.orderId)).size) : 0
      };
      
      res.status(200).json({
        success: true,
        data: {
          summary: totalPerformance,
          products: productPerformance
        }
      });
    } catch (error) {
      console.error('Error getting sales staff performance:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve sales staff performance data',
        error: error.message
      });
    }
  }

  /**
   * 获取浏览转化率报表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getConversionReport(req, res) {
    try {
      const { categoryId } = req.params;
      const { startDate, endDate } = req.query;
      
      // 构建日期查询条件
      const dateFilter = {};
      if (startDate && endDate) {
        dateFilter.createdAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      } else if (startDate) {
        dateFilter.createdAt = { [Op.gte]: new Date(startDate) };
      } else if (endDate) {
        dateFilter.createdAt = { [Op.lte]: new Date(endDate) };
      }
      
      // 获取该类别下的所有产品
      const productsQuery = { where: {} };
      if (categoryId !== 'all') {
        productsQuery.where.categoryId = categoryId;
      }
      
      const products = await db.Product.findAll(productsQuery);
      const productIds = products.map(product => product.id);
      
      // 获取浏览记录
      const browseLogsQuery = {
        where: {
          productId: { [Op.in]: productIds },
          ...dateFilter
        },
        include: [
          {
            model: db.User,
            as: 'user',
            attributes: ['id', 'username']
          }
        ]
      };
      
      const browseLogs = await db.BrowseLog.findAll(browseLogsQuery);
      
      // 获取订单记录
      const orderItemsQuery = {
        where: {
          productId: { [Op.in]: productIds },
          ...dateFilter
        },
        include: [
          {
            model: db.Order,
            as: 'order',
            attributes: ['id', 'userId', 'createdAt']
          }
        ]
      };
      
      const orderItems = await db.OrderItem.findAll(orderItemsQuery);
      
      // 按产品计算转化率数据
      const conversionData = productIds.map(productId => {
        const product = products.find(p => p.id === productId);
        const productViews = browseLogs.filter(log => log.productId === productId);
        const productPurchases = orderItems.filter(item => item.productId === productId);
        
        // 浏览人数（独立用户）
        const uniqueViewers = new Set(productViews.map(log => log.userId)).size;
        
        // 购买人数（独立用户）
        const uniqueBuyers = new Set(productPurchases.map(item => item.order.userId)).size;
        
        // 浏览总次数
        const totalViews = productViews.length;
        
        // 购买总数量
        const totalPurchased = productPurchases.reduce((sum, item) => sum + item.quantity, 0);
        
        // 计算转化率
        const conversionRate = uniqueViewers > 0 ? (uniqueBuyers / uniqueViewers) * 100 : 0;
        
        // 平均浏览时长
        const validDurations = productViews
          .filter(log => log.duration !== null && log.duration > 0)
          .map(log => log.duration);
        
        const avgViewDuration = validDurations.length > 0 ? 
          validDurations.reduce((sum, duration) => sum + duration, 0) / validDurations.length : 0;
        
        return {
          productId,
          productName: product.name,
          categoryId: product.categoryId,
          totalViews,
          uniqueViewers,
          totalPurchased,
          uniqueBuyers,
          conversionRate,
          avgViewDuration
        };
      });
      
      // 计算类别总体转化率
      const totalUniqueViewers = new Set(browseLogs.map(log => log.userId)).size;
      const totalUniqueBuyers = new Set(orderItems.map(item => item.order.userId)).size;
      const overallConversionRate = totalUniqueViewers > 0 ? 
        (totalUniqueBuyers / totalUniqueViewers) * 100 : 0;
      
      res.status(200).json({
        success: true,
        data: {
          summary: {
            categoryId: categoryId !== 'all' ? parseInt(categoryId) : 'all',
            productCount: products.length,
            totalViews: browseLogs.length,
            totalUniqueViewers,
            totalPurchases: orderItems.reduce((sum, item) => sum + item.quantity, 0),
            totalUniqueBuyers,
            overallConversionRate
          },
          products: conversionData
        }
      });
    } catch (error) {
      console.error('Error getting conversion report:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve conversion report data',
        error: error.message
      });
    }
  }

  /**
   * 获取库存预警报告
   * @param {Object} req - 请求对象 
   * @param {Object} res - 响应对象
   */
  async getInventoryAlerts(req, res) {
    try {
      const { threshold = 10, salesId } = req.query;
      
      let productQuery = {
        where: {
          stock: { [Op.lte]: threshold }
        },
        order: [['stock', 'ASC']]
      };
      
      // 如果指定了销售人员ID，则只查询其负责的产品
      if (salesId) {
        const assignedProducts = await db.SalesProductAssignment.findAll({
          where: { salesId },
          attributes: ['productId']
        });
        
        const assignedProductIds = assignedProducts.map(ap => ap.productId);
        
        if (assignedProductIds.length > 0) {
          productQuery.where.id = { [Op.in]: assignedProductIds };
        } else {
          // 没有分配产品给此销售人员时返回空数组
          return res.status(200).json({
            success: true,
            data: []
          });
        }
      }
      
      const lowStockProducts = await db.Product.findAll(productQuery);
      
      // 获取最近30天的销售速度
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const recentOrders = await db.OrderItem.findAll({
        where: {
          productId: { [Op.in]: lowStockProducts.map(p => p.id) },
          createdAt: { [Op.gte]: thirtyDaysAgo }
        }
      });
      
      // 计算每个产品的详细信息和风险等级
      const inventoryAlerts = lowStockProducts.map(product => {
        const productOrders = recentOrders.filter(order => order.productId === product.id);
        const totalSoldLast30Days = productOrders.reduce((sum, order) => sum + order.quantity, 0);
        const dailySalesRate = totalSoldLast30Days / 30;
        const daysUntilStockout = dailySalesRate > 0 ? Math.floor(product.stock / dailySalesRate) : null;
        
        // 计算风险等级
        let riskLevel = 'LOW';
        if (daysUntilStockout !== null) {
          if (daysUntilStockout <= 7) {
            riskLevel = 'HIGH';
          } else if (daysUntilStockout <= 14) {
            riskLevel = 'MEDIUM';
          }
        } else if (product.stock <= 5) {
          riskLevel = 'MEDIUM';
        }
        
        return {
          productId: product.id,
          productName: product.name,
          categoryId: product.categoryId,
          currentStock: product.stock,
          salesLast30Days: totalSoldLast30Days,
          avgDailySales: dailySalesRate,
          daysUntilStockout,
          riskLevel
        };
      });
      
      res.status(200).json({
        success: true,
        data: inventoryAlerts
      });
    } catch (error) {
      console.error('Error getting inventory alerts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve inventory alerts',
        error: error.message
      });
    }
  }
}

module.exports = new SalesStatsController();
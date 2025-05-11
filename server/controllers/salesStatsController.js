const db = require('../models');
const { Op } = require('sequelize');
const CategoryHelper = require('../services/categoryHelper');

/**
 * 销售状态与业绩统计控制器
 * 提供销售数据分析和统计功能
 */
class SalesStatsController {
  /**
   * 为销售人员生成摘要数据
   * @param {number} salesId - 销售人员ID
   * @param {Date} todayStart - 今天的开始时间
   * @param {Date} monthStart - 本月的开始时间
   * @return {Object} 销售人员摘要数据
   */
  async generateSalesSummary(salesId, todayStart, monthStart) {
    try {
      // 获取销售人员负责的产品
      const assignments = await db.SalesProductAssignment.findAll({
        where: { salesId }
      });
      
      const productIds = assignments.map(a => a.productId);
      
      // 如果没有分配产品，返回零值摘要
      if (productIds.length === 0) {
        return {
          todayRevenue: 0,
          monthRevenue: 0,
          productCount: 0,
          pendingOrders: 0
        };
      }
      
      // 获取今日销售额
      const todayOrders = await db.OrderItem.findAll({
        where: {
          productId: { [Op.in]: productIds },
          createdAt: { [Op.gte]: todayStart }
        },
        include: [{
          model: db.Order,
          as: 'order',
          where: { status: 'completed' }
        }]
      });
      
      // 获取本月销售额
      const monthOrders = await db.OrderItem.findAll({
        where: {
          productId: { [Op.in]: productIds },
          createdAt: { [Op.gte]: monthStart }
        },
        include: [{
          model: db.Order,
          as: 'order',
          where: { status: 'completed' }
        }]
      });
      
      // 获取待处理订单数量
      const pendingOrders = await db.OrderItem.count({
        where: {
          productId: { [Op.in]: productIds }
        },
        include: [{
          model: db.Order,
          as: 'order',
          where: { status: 'pending' }
        }],
        distinct: true,
        col: 'orderId'
      });
      
      // 计算今日销售额
      const todayRevenue = todayOrders.reduce((sum, item) => {
        return sum + (parseFloat(item.price) * item.quantity);
      }, 0);
      
      // 计算本月销售额
      const monthRevenue = monthOrders.reduce((sum, item) => {
        return sum + (parseFloat(item.price) * item.quantity);
      }, 0);
      
      return {
        todayRevenue,
        monthRevenue,
        productCount: productIds.length,
        pendingOrders
      };
    } catch (error) {
      console.error('生成销售摘要数据失败:', error);
      throw error;
    }
  }

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
        // 获取类别名称
      const categoryName = await CategoryHelper.getCategoryName(categoryId);
      if (!categoryName) {
        return res.status(404).json({
          success: false,
          message: '找不到指定的类别'
        });
      }
      
      // 获取该类别下的所有产品
      const products = await db.Product.findAll({
        where: { category: categoryName },
        attributes: ['id', 'name', 'price', 'stock', 'category']
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
            attributes: ['id', 'createdAt', 'status'],
            where: {
              status: { [Op.in]: ['completed', 'paid'] }  // 只计算已完成或已支付的订单
            }
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
      });      // 计算类别总体统计数据
      const categorySummary = {
        categoryId: parseInt(categoryId),
        category: categoryName,
        totalProducts: products.length,
        totalSales: salesData.reduce((sum, item) => sum + item.quantitySold, 0),
        totalRevenue: salesData.reduce((sum, item) => sum + item.revenue, 0),
        averageProductPrice: products.reduce((sum, product) => sum + parseFloat(product.price), 0) / products.length,
        lowStockProducts: products.filter(product => product.stock < 10).length,
        // 添加类别销售数量和库存数量
        soldQuantity: salesData.reduce((sum, item) => sum + item.quantitySold, 0),
        stockQuantity: products.reduce((sum, product) => sum + product.stock, 0)
      };
        res.status(200).json({
        success: true,
        data: {
          summary: categorySummary,
          products: salesData
        },
        // 添加类别业绩数据数组，便于前端直接使用
        categoryPerformance: [{
          categoryId: parseInt(categoryId),
          category: categoryName,
          totalRevenue: categorySummary.totalRevenue,
          orderCount: new Set(orderItems.filter(item => item.order && (item.order.status === 'completed' || item.order.status === 'paid')).map(item => item.order.id)).size,
          soldQuantity: categorySummary.soldQuantity,
          stockQuantity: categorySummary.stockQuantity
        }]
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
        const categoryName = await CategoryHelper.getCategoryName(categoryId);
        if (categoryName) {
          productsQuery.where.category = categoryName;
        }
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
        // 获取所有产品的类别ID映射
      const categoryIdMap = {};
      for (const product of products) {
        categoryIdMap[product.id] = await CategoryHelper.getCategoryId(product.category);
      }
      
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
          category: product.category,
          categoryId: categoryIdMap[productId],
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
          category: product.category,
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

  /**
   * 获取销售人员的类别业绩数据
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getCategoryPerformanceForSales(req, res) {
    try {
      console.log('执行 getCategoryPerformanceForSales 方法');
      const { salesId } = req.query;
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

      // 获取特定销售人员负责的产品
      let products = [];
      let productIds = [];      if (salesId) {
        console.log(`查询销售人员ID: ${salesId} 的负责产品`);
        const assignments = await db.SalesProductAssignment.findAll({
          where: { salesId: parseInt(salesId) }
        });
        
        productIds = assignments.map(a => a.productId);
        console.log(`找到 ${productIds.length} 个销售人员负责的产品`);
        
        products = await db.Product.findAll({
          where: { 
            id: { [Op.in]: productIds }
          },
          attributes: ['id', 'name', 'price', 'stock', 'category']
        });
      } else {
        console.log('查询所有产品');
        products = await db.Product.findAll({
          attributes: ['id', 'name', 'price', 'stock', 'category']
        });
        productIds = products.map(p => p.id);
      }if (products.length === 0) {
        return res.status(200).json({
          success: true,
          message: '没有找到相关产品',
          categoryPerformance: [],
          salesTrend: []
        });
      }
      
      // 使用 CategoryHelper 为产品添加 categoryId
      products = await CategoryHelper.enrichProductsWithCategoryId(products);

      // 获取产品的订单项
      const orderItems = await db.OrderItem.findAll({
        where: {
          productId: { [Op.in]: productIds },
          ...dateFilter
        },
        include: [
          {
            model: db.Order,
            as: 'order',
            attributes: ['id', 'createdAt', 'status'],
            where: { status: 'completed' }
          },
          {
            model: db.Product,
            as: 'product',
            attributes: ['id', 'name', 'category']
          }
        ]
      });

      console.log(`找到 ${orderItems.length} 个订单项`);

      // 按类别分组统计
      const categoryStats = {};
      
      // 初始化类别统计
      products.forEach(product => {
        if (!categoryStats[product.category]) {
          categoryStats[product.category] = {
            category: product.category,
            totalRevenue: 0,
            orderCount: 0,
            salesQuantity: 0,
            avgOrderValue: 0,
            currentStock: 0
          };
        }
        
        // 累加当前库存
        categoryStats[product.category].currentStock += product.stock;
      });

      // 统计销售数据
      orderItems.forEach(item => {
        const category = item.product.category;
        if (categoryStats[category]) {
          const revenue = parseFloat(item.price) * item.quantity;
          categoryStats[category].totalRevenue += revenue;
          categoryStats[category].salesQuantity += item.quantity;
          categoryStats[category].orderCount += 1;
        }
      });

      // 计算平均客单价
      Object.keys(categoryStats).forEach(key => {
        const stats = categoryStats[key];
        stats.avgOrderValue = stats.orderCount > 0 ? 
          (stats.totalRevenue / stats.orderCount) : 0;
      });

      // 生成时间序列销售趋势
      const salesTrend = await this.generateSalesTrend(productIds, startDate, endDate);

      console.log(`生成了 ${Object.keys(categoryStats).length} 个类别的统计数据`);
      
      res.status(200).json({
        success: true,
        categoryPerformance: Object.values(categoryStats),
        salesTrend
      });
    } catch (error) {
      console.error('获取类别业绩数据失败:', error);
      res.status(500).json({
        success: false,
        message: '获取类别业绩数据失败',
        error: error.message
      });
    }
  }

  /**
   * 获取销售人员负责的类别列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getAssignedCategories(req, res) {
    try {
      const { salesId } = req.params;
      
      // 先获取销售人员负责的产品
      const assignments = await db.SalesProductAssignment.findAll({
        where: { salesId }
      });
      
      if (assignments.length === 0) {
        return res.json({
          success: true,
          data: []
        });
      }
      
      const productIds = assignments.map(a => a.productId);
      
      // 获取产品信息以确定类别
      const products = await db.Product.findAll({
        where: { id: { [Op.in]: productIds } },
        attributes: ['id', 'category']
      });
      
      // 获取唯一类别列表
      const categories = [...new Set(products.map(p => p.category))];
      
      // 获取每个类别的产品数量
      const categoryData = categories.map(category => {
        const count = products.filter(p => p.category === category).length;
        return {
          category,
          productCount: count
        };
      });
      
      res.json({
        success: true,
        data: categoryData
      });
    } catch (error) {
      console.error('获取销售人员负责类别失败:', error);
      res.status(500).json({
        success: false,
        message: '获取销售人员负责类别失败',
        error: error.message
      });
    }
  }

  /**
   * 获取销售人员负责的产品列表
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getSalesStaffProducts(req, res) {
    try {
      const { salesId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      const pageSize = parseInt(limit);
      const offset = (parseInt(page) - 1) * pageSize;
      
      // 获取销售人员负责的产品ID
      const assignments = await db.SalesProductAssignment.findAll({
        where: { salesId }
      });
      
      if (assignments.length === 0) {
        return res.json({
          success: true,
          data: [],
          pagination: {
            page: parseInt(page),
            limit: pageSize,
            total: 0,
            totalPages: 0
          }
        });
      }
      
      const productIds = assignments.map(a => a.productId);
      
      // 获取产品总数
      const total = await db.Product.count({
        where: { id: { [Op.in]: productIds } }
      });
      
      // 获取分页后的产品信息
      const products = await db.Product.findAll({
        where: { id: { [Op.in]: productIds } },
        limit: pageSize,
        offset,
        order: [['id', 'ASC']]
      });
      
      // 查询产品的销售情况
      const productData = await Promise.all(products.map(async (product) => {
        // 获取产品销售量
        const soldQuantity = await db.OrderItem.sum('quantity', {
          where: { productId: product.id },
          include: [{
            model: db.Order,
            as: 'order',
            where: { status: 'completed' }
          }]
        }) || 0;
        
        return {
          ...product.toJSON(),
          soldQuantity
        };
      }));
      
      res.json({
        success: true,
        data: productData,
        pagination: {
          page: parseInt(page),
          limit: pageSize,
          total,
          totalPages: Math.ceil(total / pageSize)
        }
      });
    } catch (error) {
      console.error('获取销售人员负责产品失败:', error);
      res.status(500).json({
        success: false,
        message: '获取销售人员负责产品失败',
        error: error.message
      });
    }
  }

  /**
   * 辅助方法：生成销售趋势数据
   * @param {Array} productIds - 产品ID数组
   * @param {string} startDate - 开始日期
   * @param {string} endDate - 结束日期
   * @return {Array} 销售趋势数据
   */
  async generateSalesTrend(productIds, startDate, endDate) {
    try {
      // 默认显示最近30天
      let start = new Date();
      start.setDate(start.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      
      let end = new Date();
      end.setHours(23, 59, 59, 999);
      
      if (startDate) {
        start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
      }
      
      if (endDate) {
        end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
      }
      
      // 获取时间范围内的所有订单项
      const orderItems = await db.OrderItem.findAll({
        where: {
          productId: { [Op.in]: productIds },
          createdAt: { [Op.between]: [start, end] }
        },
        include: [
          {
            model: db.Order,
            as: 'order',
            attributes: ['id', 'createdAt', 'status'],
            where: { status: 'completed' }
          }
        ]
      });
      
      // 按日期分组
      const salesByDate = {};
      
      // 初始化日期范围内的所有日期
      const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      for (let i = 0; i < days; i++) {
        const date = new Date(start);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        salesByDate[dateStr] = {
          date: dateStr,
          revenue: 0,
          quantity: 0
        };
      }
      
      // 汇总销售数据
      orderItems.forEach(item => {
        const dateStr = item.order.createdAt.toISOString().split('T')[0];
        if (salesByDate[dateStr]) {
          salesByDate[dateStr].revenue += parseFloat(item.price) * item.quantity;
          salesByDate[dateStr].quantity += item.quantity;
        }
      });
      
      // 转换为数组并按日期排序
      const trend = Object.values(salesByDate);
      trend.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      return trend;
    } catch (error) {
      console.error('生成销售趋势数据失败:', error);
      return [];
    }
  }

  /**
   * 获取销售人员负责的类别
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getAssignedCategories(req, res) {
    try {
      console.log('执行 getAssignedCategories 方法');
      const { salesId } = req.params;
      
      if (!salesId) {
        return res.status(400).json({
          success: false,
          message: '请提供销售人员ID'
        });
      }
      
      console.log(`查询销售人员ID: ${salesId} 的负责类别`);
      
      // 查询销售人员负责的产品
      const assignments = await db.SalesProductAssignment.findAll({
        where: { salesId: parseInt(salesId) }
      });
      
      if (!assignments || assignments.length === 0) {
        console.log(`销售人员ID ${salesId} 没有负责任何产品`);
        return res.status(200).json({
          success: true,
          categories: []
        });
      }
      
      const productIds = assignments.map(a => a.productId);
      console.log(`找到 ${productIds.length} 个销售人员负责的产品`);
      
      // 获取这些产品的类别
      const products = await db.Product.findAll({
        where: { id: { [Op.in]: productIds } },
        attributes: ['category']
      });
      
      // 提取唯一的类别
      const categories = [...new Set(products.map(p => p.category))];
      console.log(`找到 ${categories.length} 个唯一类别`);
      
      res.status(200).json({
        success: true,
        categories
      });
    } catch (error) {
      console.error('获取销售人员负责类别失败:', error);
      res.status(500).json({
        success: false,
        message: '获取销售人员负责类别失败',
        error: error.message
      });
    }
  }

  /**
   * 获取销售人员负责的产品
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getSalesStaffProducts(req, res) {
    try {
      console.log('执行 getSalesStaffProducts 方法');
      const { salesId } = req.params;
      const { page = 1, limit = 20, category, stockStatus } = req.query;
      
      if (!salesId) {
        return res.status(400).json({
          success: false,
          message: '请提供销售人员ID'
        });
      }
      
      console.log(`查询销售人员ID: ${salesId} 的负责产品，页码: ${page}, 每页: ${limit}`);
      
      // 查询销售人员负责的产品ID
      const assignments = await db.SalesProductAssignment.findAll({
        where: { salesId: parseInt(salesId) }
      });
      
      if (!assignments || assignments.length === 0) {
        console.log(`销售人员ID ${salesId} 没有负责任何产品`);
        return res.status(200).json({
          success: true,
          products: [],
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            totalItems: 0,
            totalPages: 0
          }
        });
      }
      
      const productIds = assignments.map(a => a.productId);
      console.log(`找到 ${productIds.length} 个销售人员负责的产品ID`);
      
      // 构建产品查询条件
      const where = { id: { [Op.in]: productIds } };
      
      // 添加类别筛选
      if (category) {
        where.category = category;
      }
      
      // 添加库存状态筛选
      if (stockStatus) {
        if (stockStatus === 'normal') {
          where.stock = { [Op.gt]: 10 };
        } else if (stockStatus === 'warning') {
          where.stock = { [Op.and]: [{ [Op.gt]: 0 }, { [Op.lte]: 10 }] };
        } else if (stockStatus === 'danger') {
          where.stock = { [Op.lte]: 0 };
        }
      }
      
      // 分页查询产品
      const offset = (parseInt(page) - 1) * parseInt(limit);
      
      const { count, rows } = await db.Product.findAndCountAll({
        where,
        limit: parseInt(limit),
        offset,
        order: [['stock', 'ASC']]  // 按库存升序排列，库存少的优先显示
      });
      
      console.log(`查询到 ${rows.length} 个产品，总共 ${count} 个符合条件的产品`);
      
      // 获取这些产品的销售数据
      const productIds30Days = rows.map(p => p.id);
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const orderItems = await db.OrderItem.findAll({
        where: {
          productId: { [Op.in]: productIds30Days },
          createdAt: { [Op.gte]: thirtyDaysAgo }
        },
        include: [
          {
            model: db.Order,
            as: 'order',
            attributes: ['id', 'createdAt', 'status'],
            where: { status: 'completed' }
          }
        ]
      });
      
      // 计算每个产品的销售数据
      const salesData = {};
      orderItems.forEach(item => {
        if (!salesData[item.productId]) {
          salesData[item.productId] = {
            quantitySold: 0,
            lastSold: null
          };
        }
        
        salesData[item.productId].quantitySold += item.quantity;
        
        const soldDate = new Date(item.order.createdAt);
        if (!salesData[item.productId].lastSold || 
            soldDate > salesData[item.productId].lastSold) {
          salesData[item.productId].lastSold = soldDate;
        }
      });
      
      // 组合产品信息和销售数据
      const products = rows.map(product => {
        const productSales = salesData[product.id] || {
          quantitySold: 0,
          lastSold: null
        };
        
        return {
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.price,
          stock: product.stock,
          quantitySold: productSales.quantitySold,
          lastSold: productSales.lastSold
        };
      });
      
      res.status(200).json({
        success: true,
        products,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalItems: count,
          totalPages: Math.ceil(count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('获取销售人员负责产品失败:', error);
      res.status(500).json({
        success: false,
        message: '获取销售人员负责产品失败',
        error: error.message
      });
    }
  }
}

module.exports = new SalesStatsController();
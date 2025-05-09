const db = require('../models');
const { Op } = require('sequelize');

/**
 * 日志记录与查询控制器
 * 提供统一的日志管理功能
 */
class LogController {
  /**
   * 获取用户登录日志
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getLoginLogs(req, res) {
    try {
      const { userId, role, startDate, endDate, action, page = 1, limit = 20 } = req.query;
      
      // 构建查询条件
      const where = {};
      
      if (userId) {
        where.userId = userId;
      }
      
      if (role) {
        where.role = role;
      }
      
      if (action) {
        where.action = action;
      }
      
      // 日期范围过滤
      if (startDate || endDate) {
        where.timestamp = {};
        
        if (startDate) {
          where.timestamp[Op.gte] = new Date(startDate);
        }
        
        if (endDate) {
          where.timestamp[Op.lte] = new Date(endDate);
        }
      }
      
      // 执行分页查询
      const offset = (page - 1) * limit;
      
      const logs = await db.LoginLog.findAndCountAll({
        where,
        include: [
          {
            model: db.User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'role']
          }
        ],
        order: [['timestamp', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      // 计算分页元数据
      const totalPages = Math.ceil(logs.count / limit);
      
      res.status(200).json({
        success: true,
        data: logs.rows,
        pagination: {
          total: logs.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      });
    } catch (error) {
      console.error('Error fetching login logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch login logs',
        error: error.message
      });
    }
  }
  
  /**
   * 获取用户活动日志
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getActivityLogs(req, res) {
    try {
      const { 
        userId, role, action, module, status,
        startDate, endDate, page = 1, limit = 20 
      } = req.query;
      
      // 构建查询条件
      const where = {};
      
      if (userId) {
        where.userId = userId;
      }
      
      if (role) {
        where.role = role;
      }
      
      if (action) {
        where.action = action;
      }
      
      if (module) {
        where.module = module;
      }
      
      if (status) {
        where.status = status;
      }
      
      // 日期范围过滤
      if (startDate || endDate) {
        where.timestamp = {};
        
        if (startDate) {
          where.timestamp[Op.gte] = new Date(startDate);
        }
        
        if (endDate) {
          where.timestamp[Op.lte] = new Date(endDate);
        }
      }
      
      // 执行分页查询
      const offset = (page - 1) * limit;
      
      const logs = await db.ActivityLog.findAndCountAll({
        where,
        include: [
          {
            model: db.User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'role']
          }
        ],
        order: [['timestamp', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      // 计算分页元数据
      const totalPages = Math.ceil(logs.count / limit);
      
      res.status(200).json({
        success: true,
        data: logs.rows,
        pagination: {
          total: logs.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      });
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch activity logs',
        error: error.message
      });
    }
  }
  
  /**
   * 获取用户产品浏览记录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getProductViewLogs(req, res) {
    try {
      const { 
        userId, productId, minDuration,
        startDate, endDate, page = 1, limit = 20 
      } = req.query;
      
      // 构建查询条件
      const where = {};
      
      if (userId) {
        where.userId = userId;
      }
      
      if (productId) {
        where.productId = productId;
      }
      
      if (minDuration) {
        where.durationSeconds = { [Op.gte]: parseInt(minDuration) };
      }
      
      // 日期范围过滤
      if (startDate || endDate) {
        where.createdAt = {};
        
        if (startDate) {
          where.createdAt[Op.gte] = new Date(startDate);
        }
        
        if (endDate) {
          where.createdAt[Op.lte] = new Date(endDate);
        }
      }
      
      // 执行分页查询
      const offset = (page - 1) * limit;
      
      const logs = await db.sequelize.models.ProductViewLog.findAndCountAll({
        where,
        include: [
          {
            model: db.User,
            as: 'user',
            attributes: ['id', 'username', 'email', 'role']
          },
          {
            model: db.Product,
            as: 'product',
            attributes: ['id', 'name', 'categoryId', 'price']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      // 计算分页元数据
      const totalPages = Math.ceil(logs.count / limit);
      
      res.status(200).json({
        success: true,
        data: logs.rows,
        pagination: {
          total: logs.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      });
    } catch (error) {
      console.error('Error fetching product view logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch product view logs',
        error: error.message
      });
    }
  }
  
  /**
   * 获取销售人员管理的商品的浏览记录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getSalesProductViewLogs(req, res) {
    try {
      const { salesId } = req.params;
      const { startDate, endDate, page = 1, limit = 20 } = req.query;
      
      // 验证销售人员身份
      const salesStaff = await db.User.findOne({
        where: { id: salesId, role: 'sales' }
      });
      
      if (!salesStaff) {
        return res.status(404).json({
          success: false,
          message: 'Sales staff not found'
        });
      }
      
      // 获取销售人员负责的产品
      const assignedProducts = await db.SalesProductAssignment.findAll({
        where: { salesId: salesId },
        attributes: ['productId']
      });
      
      const productIds = assignedProducts.map(p => p.productId);
      
      if (productIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: 0
          }
        });
      }
      
      // 构建查询条件
      const where = {
        productId: { [Op.in]: productIds }
      };
      
      // 日期范围过滤
      if (startDate || endDate) {
        where.createdAt = {};
        
        if (startDate) {
          where.createdAt[Op.gte] = new Date(startDate);
        }
        
        if (endDate) {
          where.createdAt[Op.lte] = new Date(endDate);
        }
      }
      
      // 执行分页查询
      const offset = (page - 1) * limit;
      
      const logs = await db.sequelize.models.ProductViewLog.findAndCountAll({
        where,
        include: [
          {
            model: db.User,
            as: 'user',
            attributes: ['id', 'username', 'email']
          },
          {
            model: db.Product,
            as: 'product',
            attributes: ['id', 'name', 'categoryId', 'price']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      // 计算分页元数据
      const totalPages = Math.ceil(logs.count / limit);
      
      res.status(200).json({
        success: true,
        data: logs.rows,
        pagination: {
          total: logs.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      });
    } catch (error) {
      console.error('Error fetching sales product view logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sales product view logs',
        error: error.message
      });
    }
  }
  
  /**
   * 获取用户购买记录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getPurchaseLogs(req, res) {
    try {
      const { 
        userId, productId, categoryId,
        startDate, endDate, page = 1, limit = 20 
      } = req.query;
      
      // 构建商品查询条件
      const productWhere = {};
      
      if (productId) {
        productWhere.id = productId;
      }
      
      if (categoryId) {
        productWhere.categoryId = categoryId;
      }
      
      // 构建订单查询条件
      const orderWhere = {
        status: { [Op.in]: ['completed', 'shipped', 'delivered'] }
      };
      
      if (userId) {
        orderWhere.userId = userId;
      }
      
      // 日期范围过滤
      if (startDate || endDate) {
        orderWhere.createdAt = {};
        
        if (startDate) {
          orderWhere.createdAt[Op.gte] = new Date(startDate);
        }
        
        if (endDate) {
          orderWhere.createdAt[Op.lte] = new Date(endDate);
        }
      }
      
      // 执行分页查询
      const offset = (page - 1) * limit;
      
      const orderItems = await db.OrderItem.findAndCountAll({
        include: [
          {
            model: db.Order,
            as: 'order',
            where: orderWhere,
            include: [
              {
                model: db.User,
                as: 'user',
                attributes: ['id', 'username', 'email']
              }
            ]
          },
          {
            model: db.Product,
            as: 'product',
            where: Object.keys(productWhere).length > 0 ? productWhere : undefined,
            attributes: ['id', 'name', 'categoryId', 'price']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      // 计算分页元数据
      const totalPages = Math.ceil(orderItems.count / limit);
      
      // 格式化返回数据，呈现为日志格式
      const purchaseLogs = orderItems.rows.map(item => ({
        id: item.id,
        userId: item.order.userId,
        user: item.order.user,
        orderId: item.orderId,
        orderDate: item.order.createdAt,
        productId: item.productId,
        product: item.product,
        categoryId: item.product.categoryId,
        quantity: item.quantity,
        unitPrice: item.price,
        totalAmount: item.price * item.quantity
      }));
      
      res.status(200).json({
        success: true,
        data: purchaseLogs,
        pagination: {
          total: orderItems.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      });
    } catch (error) {
      console.error('Error fetching purchase logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch purchase logs',
        error: error.message
      });
    }
  }
  
  /**
   * 获取销售人员管理的商品的购买记录
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getSalesPurchaseLogs(req, res) {
    try {
      const { salesId } = req.params;
      const { startDate, endDate, page = 1, limit = 20 } = req.query;
      
      // 验证销售人员身份
      const salesStaff = await db.User.findOne({
        where: { id: salesId, role: 'sales' }
      });
      
      if (!salesStaff) {
        return res.status(404).json({
          success: false,
          message: 'Sales staff not found'
        });
      }
      
      // 获取销售人员负责的产品
      const assignedProducts = await db.SalesProductAssignment.findAll({
        where: { salesId: salesId },
        attributes: ['productId']
      });
      
      const productIds = assignedProducts.map(p => p.productId);
      
      if (productIds.length === 0) {
        return res.status(200).json({
          success: true,
          data: [],
          pagination: {
            total: 0,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: 0
          }
        });
      }
      
      // 构建订单查询条件
      const orderWhere = {
        status: { [Op.in]: ['completed', 'shipped', 'delivered'] }
      };
      
      // 日期范围过滤
      if (startDate || endDate) {
        orderWhere.createdAt = {};
        
        if (startDate) {
          orderWhere.createdAt[Op.gte] = new Date(startDate);
        }
        
        if (endDate) {
          orderWhere.createdAt[Op.lte] = new Date(endDate);
        }
      }
      
      // 执行分页查询
      const offset = (page - 1) * limit;
      
      const orderItems = await db.OrderItem.findAndCountAll({
        where: {
          productId: { [Op.in]: productIds }
        },
        include: [
          {
            model: db.Order,
            as: 'order',
            where: orderWhere,
            include: [
              {
                model: db.User,
                as: 'user',
                attributes: ['id', 'username', 'email']
              }
            ]
          },
          {
            model: db.Product,
            as: 'product',
            attributes: ['id', 'name', 'categoryId', 'price']
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit),
        offset: parseInt(offset)
      });
      
      // 计算分页元数据
      const totalPages = Math.ceil(orderItems.count / limit);
      
      // 格式化返回数据，呈现为日志格式
      const purchaseLogs = orderItems.rows.map(item => ({
        id: item.id,
        userId: item.order.userId,
        user: item.order.user,
        orderId: item.orderId,
        orderDate: item.order.createdAt,
        productId: item.productId,
        product: item.product,
        categoryId: item.product.categoryId,
        quantity: item.quantity,
        unitPrice: item.price,
        totalAmount: item.price * item.quantity
      }));
      
      res.status(200).json({
        success: true,
        data: purchaseLogs,
        pagination: {
          total: orderItems.count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        }
      });
    } catch (error) {
      console.error('Error fetching sales purchase logs:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch sales purchase logs',
        error: error.message
      });
    }
  }
}

module.exports = new LogController();
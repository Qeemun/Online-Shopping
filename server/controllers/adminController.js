const db = require('../models');
const { Op } = require('sequelize');

/**
 * 管理员控制器
 * 提供管理员特有功能和数据接口
 */
class AdminController {
  /**
   * 获取管理员仪表板摘要数据
   * @param {Object} req - 请求对象
   * @param {Object} res - 响应对象
   */
  async getDashboardSummary(req, res) {
    try {
      // 获取今天的日期范围
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // 获取用户总数
      const totalUsers = await db.User.count({
        where: {
          role: 'customer' // 只统计客户角色
        }
      });
      
      // 获取销售人员总数
      const totalSalesStaff = await db.User.count({
        where: {
          role: 'sales'
        }
      });
      
      // 获取今日订单数
      const todayOrders = await db.Order.count({
        where: {
          createdAt: {
            [Op.gte]: today
          }
        }
      });
      
      // 获取今日销售额
      const todaySalesData = await db.Order.sum('totalAmount', {
        where: {
          createdAt: {
            [Op.gte]: today
          },
          status: 'completed' // 只计算已完成的订单
        }
      });
      
      // 处理可能的 null 结果
      const todaySales = todaySalesData || 0;
      
      // 返回摘要数据
      res.status(200).json({
        success: true,
        summary: {
          totalUsers,
          totalSalesStaff,
          todayOrders,
          todaySales
        }
      });
    } catch (error) {
      console.error('获取管理员仪表板摘要失败:', error);
      res.status(500).json({
        success: false,
        message: '获取管理员仪表板摘要失败',
        error: error.message
      });
    }
  }
}

module.exports = new AdminController();

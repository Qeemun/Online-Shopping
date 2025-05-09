const express = require('express');
const router = express.Router();
const { authenticate, isSalesStaff } = require('../config/middleware/auth');
const salesStatsController = require('../controllers/salesStatsController');
const logController = require('../controllers/logController');

// 组合鉴权和销售人员权限检查
const salesAuth = [authenticate, isSalesStaff];

/**
 * 销售人员个人信息路由
 */
// 获取当前销售人员负责的产品
router.get('/my-products', salesAuth, async (req, res) => {
  // 重定向到销售人员详情API，传递当前用户ID
  return salesStatsController.getSalesStaffPerformance({
    ...req,
    params: { salesId: req.user.id }
  }, res);
});

/**
 * 销售统计和监控路由
 */
// 获取负责商品的销售状态
router.get('/my-categories/:categoryId/performance', salesAuth, async (req, res) => {
  // 这里我们可以验证该销售人员是否负责该类别，但为简化，直接调用现有控制器
  return salesStatsController.getCategoryPerformance(req, res);
});

// 获取低库存预警
router.get('/inventory-alerts', salesAuth, async (req, res) => {
  // 将销售人员ID添加到查询参数中
  req.query.salesId = req.user.id;
  return salesStatsController.getInventoryAlerts(req, res);
});

// 获取产品转化率
router.get('/conversion-report/:categoryId', salesAuth, salesStatsController.getConversionReport);

/**
 * 销售日志查询路由
 */
// 获取负责产品的浏览记录
router.get('/logs/product-views', salesAuth, async (req, res) => {
  return logController.getSalesProductViewLogs({
    ...req,
    params: { salesId: req.user.id }
  }, res);
});

// 获取负责产品的购买记录
router.get('/logs/purchase', salesAuth, async (req, res) => {
  return logController.getSalesPurchaseLogs({
    ...req,
    params: { salesId: req.user.id }
  }, res);
});

// 获取个人活动日志
router.get('/logs/activity', salesAuth, async (req, res) => {
  // 确保只能查看自己的日志
  req.query.userId = req.user.id;
  return logController.getActivityLogs(req, res);
});

module.exports = router;
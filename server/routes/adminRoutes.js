const express = require('express');
const router = express.Router();
const { authenticate, isAdmin } = require('../config/middleware/auth');
const salesStaffController = require('../controllers/salesStaffController');
const salesStatsController = require('../controllers/salesStatsController');
const logController = require('../controllers/logController');

// 组合鉴权和管理员权限检查
const adminAuth = [authenticate, isAdmin];

/**
 * 销售人员管理路由
 */
// 获取所有销售人员列表
router.get('/sales-staff', adminAuth, salesStaffController.getAllSalesStaff);

// 创建新销售人员
router.post('/sales-staff', adminAuth, salesStaffController.createSalesStaff);

// 获取单个销售人员详情
router.get('/sales-staff/:id', adminAuth, salesStaffController.getSalesStaffById);

// 更新销售人员信息
router.put('/sales-staff/:id', adminAuth, salesStaffController.updateSalesStaff);

// 删除销售人员
router.delete('/sales-staff/:id', adminAuth, salesStaffController.deleteSalesStaff);

// 重置销售人员密码
router.post('/sales-staff/:id/reset-password', adminAuth, salesStaffController.resetSalesStaffPassword);

// 分配产品给销售人员
router.post('/sales-staff/:id/assign-products', adminAuth, salesStaffController.assignProducts);

// 取消分配产品给销售人员
router.post('/sales-staff/:id/unassign-products', adminAuth, salesStaffController.unassignProducts);

/**
 * 销售统计和报表路由
 */
// 获取特定商品类别的销售状态
router.get('/category/:categoryId/performance', adminAuth, salesStatsController.getCategoryPerformance);

// 获取销售人员业绩报表
router.get('/sales-staff/:salesId/performance', adminAuth, salesStatsController.getSalesStaffPerformance);

// 获取浏览转化率报表
router.get('/conversion-report/:categoryId', adminAuth, salesStatsController.getConversionReport);

// 获取库存预警报告
router.get('/inventory-alerts', adminAuth, salesStatsController.getInventoryAlerts);

/**
 * 日志查询路由
 */
// 获取登录日志
router.get('/logs/login', adminAuth, logController.getLoginLogs);

// 获取活动日志
router.get('/logs/activity', adminAuth, logController.getActivityLogs);

// 获取产品浏览记录 (更新为使用新的ProductViewLog)
router.get('/logs/product-views', adminAuth, logController.getProductViewLogs);

// 获取购买记录
router.get('/logs/purchase', adminAuth, logController.getPurchaseLogs);

module.exports = router;
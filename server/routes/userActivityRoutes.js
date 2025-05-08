const express = require('express');
const router = express.Router();
const userActivityController = require('../controllers/userActivityLogController');
const { verifyToken } = require('../controllers/userController');

// 获取所有客户
router.get('/customers', userActivityController.getAllCustomers);

// 获取单个客户信息
router.get('/customers/:customerId', userActivityController.getCustomerDetails);

// 添加新客户
router.post('/customers', userActivityController.addCustomer);

// 更新客户信息
router.put('/customers/:customerId', userActivityController.updateCustomer);

// 删除客户
router.delete('/customers/:customerId', userActivityController.deleteCustomer);

// 获取用户活动日志
router.get('/customers/:customerId/logs', userActivityController.getUserActivityLogs);

// 添加用户活动日志
router.post('/logs', userActivityController.addUserActivityLog);

// 获取产品活动统计
router.get('/products/:productId/stats', userActivityController.getProductActivityStats);

// === 销售人员权限功能 ===

// 获取销售人员负责商品的用户活动日志
router.get('/sales/logs', verifyToken(), userActivityController.getSalesProductLogs);

// 获取销售人员负责商品的用户活动统计
router.get('/sales/stats', verifyToken(), userActivityController.getSalesProductStats);

module.exports = router;
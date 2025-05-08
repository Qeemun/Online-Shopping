const express = require('express');
const router = express.Router();
const salesStaffController = require('../controllers/salesStaffController');
const authMiddleware = require('../config/middleware/authMiddleware');

// 初始化销售人员与产品关联表
salesStaffController.initializeAssociations();

// 保护所有路由 - 需要登录
router.use(authMiddleware.verifyToken);

// === 管理员接口 ===

// 获取所有销售人员
router.get('/', salesStaffController.getAllSalesStaff);

// 获取可分配的商品列表
router.get('/available-products', salesStaffController.getAvailableProducts);

// 添加新销售人员
router.post('/', salesStaffController.addSalesStaff);

// 获取单个销售人员详情
router.get('/:salesId', salesStaffController.getSalesStaffDetails);

// 更新销售人员信息
router.put('/:salesId', salesStaffController.updateSalesStaff);

// 删除销售人员
router.delete('/:salesId', salesStaffController.deleteSalesStaff);

// 重置销售人员密码
router.post('/:salesId/reset-password', salesStaffController.resetSalesStaffPassword);

// 获取销售人员负责的商品
router.get('/:salesId/products', salesStaffController.getSalesStaffProducts);

// 为销售人员分配商品
router.post('/:salesId/products', authMiddleware.isAdmin, salesStaffController.assignProductToSalesStaff);

// 取消销售人员的商品分配
router.delete('/:salesId/products/:productId', authMiddleware.isAdmin, salesStaffController.unassignProductFromSalesStaff);

// 获取销售人员业绩统计
router.get('/performance', authMiddleware.isAdmin, salesStaffController.getSalesPerformance);

// === 销售人员接口 ===

// 获取当前销售人员负责的商品类别
router.get('/my/categories', salesStaffController.getSalesStaffCategories);

// 更新销售人员负责商品的信息
router.put('/products/:productId', salesStaffController.updateSalesProductInfo);

// 获取产品销售状态
router.get('/products/:productId/status', salesStaffController.getProductSalesStatus);

// 获取销售人员摘要数据
router.get('/:id/summary', salesStaffController.getSalesSummary);

// 获取销售人员管理的类别
router.get('/:id/categories', salesStaffController.getSalesStaffCategories);

module.exports = router;
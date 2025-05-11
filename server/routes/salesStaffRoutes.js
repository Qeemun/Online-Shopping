const express = require('express');
const router = express.Router();
const salesStaffController = require('../controllers/salesStaffController');
const { authenticate, isAdmin } = require('../config/middleware/auth');

// 组合鉴权和管理员权限检查
const adminAuth = [authenticate, isAdmin];

// 保护所有路由 - 需要管理员权限
router.use(adminAuth);

// === 管理员接口 ===

// 获取所有销售人员
router.get('/', salesStaffController.getAllSalesStaff);

// 添加新销售人员
router.post('/', salesStaffController.createSalesStaff);

// 获取单个销售人员详情
router.get('/:id', salesStaffController.getSalesStaffById);

// 更新销售人员信息
router.put('/:id', salesStaffController.updateSalesStaff);

// 删除销售人员
router.delete('/:id', salesStaffController.deleteSalesStaff);

// 重置销售人员密码
router.post('/:id/reset-password', salesStaffController.resetSalesStaffPassword);

// 为销售人员分配商品
router.post('/:id/assign-products', salesStaffController.assignProducts);

// 取消销售人员的商品分配
router.post('/:id/unassign-products', salesStaffController.unassignProducts);

module.exports = router;
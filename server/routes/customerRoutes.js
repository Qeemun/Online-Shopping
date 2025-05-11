const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// 检查是否具有管理员权限的中间件
const adminAuthCheck = (req, res, next) => {
    if (req.role !== 'admin') {
        return res.status(403).json({ success: false, message: '只有管理员才能访问客户管理功能' });
    }
    next();
};

// 获取所有客户
router.get('/', userController.verifyToken(), adminAuthCheck, userController.getAllCustomers);

// 获取单个客户
router.get('/:id', userController.verifyToken(), adminAuthCheck, userController.getCustomerById);

// 更新客户信息
router.put('/:id', userController.verifyToken(), adminAuthCheck, userController.updateCustomer);

// 删除客户
router.delete('/:id', userController.verifyToken(), adminAuthCheck, userController.deleteCustomer);

module.exports = router;

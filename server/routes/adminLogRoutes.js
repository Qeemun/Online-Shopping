const express = require('express');
const router = express.Router();
const adminLogController = require('../controllers/adminActionLogController');
const { verifyToken } = require('../controllers/userController');

// 中间件：检查管理员权限
const checkAdminRole = (req, res, next) => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'sales')) {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: '权限不足，需要管理员或销售权限'
    });
};

// 获取管理员操作日志列表
router.get('/logs', verifyToken(), checkAdminRole, adminLogController.getAdminLogs);

// 获取操作统计数据
router.get('/stats', verifyToken(), checkAdminRole, adminLogController.getActionStats);

// 清理旧日志（仅管理员权限）
router.post('/cleanup', verifyToken('admin'), adminLogController.cleanupLogs);

// 初始化关联
adminLogController.updateAssociation().catch(console.error);

module.exports = router;
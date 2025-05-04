const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');

// 注册路由
router.post('/register', (req, res) => {
    console.log('Received POST /users/register');
    console.log('Request Body:', req.body);  // 打印请求体内容
    userController.register(req, res);
});

// 登录路由
router.post('/login', userController.login);

// 注销路由
router.post('/logout', userController.logout);

// 获取当前用户信息（GET /users）
router.get('/', userController.verifyToken(), userController.getUserProfile);

// 获取用户画像（包含消费统计、活动记录和类别偏好）
router.get('/profile/details', userController.verifyToken(), userController.getUserProfileDetails);

// 获取指定用户的画像（管理员和销售专用）
router.get('/:userId/profile', userController.verifyToken(), userController.getUserProfileDetails);

// 更新用户画像
router.put('/profile', userController.verifyToken(), userController.updateUserProfile);

// 更新用户偏好类别
router.put('/profile/favorite-category', userController.verifyToken(), userController.updateFavoriteCategory);

// 获取用户会话日志
router.get('/session-logs', userController.verifyToken(), userController.getUserSessionLogs);

// 获取指定用户的会话日志（管理员和销售专用）
router.get('/:userId/session-logs', userController.verifyToken(), userController.getUserSessionLogs);

// 获取用户统计信息（管理员和销售专用）
router.get('/stats', userController.verifyToken(), userController.getUserStats);

// 保护路由，验证 JWT，顾客角色
router.get('/profile', userController.verifyToken('customer'), (req, res) => {
    res.json({ message: '顾客访问成功', userId: req.userId });
});

// 保护路由，验证 JWT，销售角色
router.get('/sales-dashboard', userController.verifyToken('sales'), (req, res) => {
    res.json({ message: '销售人员访问成功', userId: req.userId });
});

module.exports = router;
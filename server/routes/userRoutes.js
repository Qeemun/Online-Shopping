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
router.get('/', userController.getUserProfile);  // 添加 GET /users 路由

// 保护路由，验证 JWT，顾客角色
router.get('/profile', userController.verifyToken('customer'), (req, res) => {
    res.json({ message: '顾客访问成功', userId: req.userId });
});

// 保护路由，验证 JWT，销售角色
router.get('/sales-dashboard', userController.verifyToken('sales'), (req, res) => {
    res.json({ message: '销售人员访问成功', userId: req.userId });
});

module.exports = router;
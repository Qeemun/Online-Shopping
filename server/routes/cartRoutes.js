const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authenticate = require('../config/middleware/authenticate'); // 用户认证中间件

// 添加商品到购物车
router.post('/add', authenticate, cartController.addToCart);

// 获取购物车中的所有商品
router.get('/items', authenticate, cartController.getCartItems);

// 删除购物车中的商品
router.delete('/delete', authenticate, cartController.deleteCartItem);

module.exports = router;
const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const authenticate = require('../config/middleware/authenticate');

// 获取购物车商品
router.get('/items', authenticate, cartController.getCartItems);

// 添加商品到购物车
router.post('/add', authenticate, cartController.addToCart);

// 更新购物车商品数量
router.put('/update', authenticate, cartController.updateCartItem);

// 删除购物车商品
router.delete('/remove', authenticate, cartController.removeFromCart);

module.exports = router;
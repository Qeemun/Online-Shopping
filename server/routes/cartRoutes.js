const express = require('express');
const router = express.Router();
const cartController = require('../controllers/cartController');
const { verifyToken } = require('../controllers/userController');

// 获取购物车商品
router.get('/items', verifyToken(), cartController.getCartItems);

// 添加商品到购物车 - POST /cart (没有/add)
router.post('/', verifyToken(), cartController.addToCart);

// 更新购物车商品数量
router.put('/update', verifyToken(), cartController.updateCartItem);

// 删除购物车商品
router.delete('/remove', verifyToken(), cartController.removeFromCart);

module.exports = router;
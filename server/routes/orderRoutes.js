const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const authenticate = require('../config/middleware/authenticate');

// 创建订单
router.post('/create', authenticate, orderController.createOrder);

// 查看用户历史订单
router.get('/history', authenticate, orderController.getOrderHistory);

// 获取订单详情
router.get('/:orderId', authenticate, orderController.getOrderDetails);

// 获取所有订单
router.get('/',  orderController.getAllOrders);

// 更新订单状态和信息
router.put('/update/:orderId', orderController.updateOrderStatus);

// 删除订单
router.delete('/:orderId', orderController.deleteOrder);
module.exports = router;

const express = require('express');
const router = express.Router();
const paymentController = require('../controllers/paymentController');

// 模拟支付请求
router.post('/', paymentController.processPayment);

module.exports = router;

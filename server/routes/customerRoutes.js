const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerLogController');

// 获取所有客户
router.get('/', customerController.getAllCustomers);

// 获取单个客户信息
router.get('/:customerId', customerController.getCustomerDetails);

// 添加新客户
router.post('/', customerController.addCustomer);

// 更新客户信息
router.put('/:customerId', customerController.updateCustomer);

// 删除客户
router.delete('/:customerId', customerController.deleteCustomer);

// 获取客户日志
router.get('/:customerId/logs', customerController.getCustomerLogs);

module.exports = router;
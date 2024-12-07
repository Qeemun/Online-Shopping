const express = require('express');
const router = express.Router();
const salesReportController = require('../controllers/salesReportController');

// 获取总销售额
router.get('/total-sales', async (req, res) => {
    const { startDate, endDate } = req.query;
    const totalSales = await salesReportController.getTotalSales(startDate, endDate);
    res.json({ totalSales });
});

// 获取商品销售情况
router.get('/product-sales', async (req, res) => {
    const { startDate, endDate } = req.query;
    const productSales = await salesReportController.getProductSales(startDate, endDate);
    res.json({ productSales });
});

// 获取按时间段的销售额
router.get('/sales-by-time-period', async (req, res) => {
    const { startDate, endDate, period } = req.query; // period 可以是 'day', 'month', 'year'
    const salesByPeriod = await salesReportController.getSalesByTimePeriod(startDate, endDate, period);
    res.json({ salesByPeriod });
});

module.exports = router;

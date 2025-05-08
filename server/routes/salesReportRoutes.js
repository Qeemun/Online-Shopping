const express = require('express');
const router = express.Router();
const salesReportController = require('../controllers/salesReportController');
const { verifyToken } = require('../controllers/userController');

// 中间件：检查管理员权限
const checkAdminRole = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: '权限不足，需要管理员权限'
    });
};

// 中间件：检查销售人员或管理员权限
const checkSalesOrAdminRole = (req, res, next) => {
    if (req.user && (req.user.role === 'sales' || req.user.role === 'admin')) {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: '权限不足，需要销售人员或管理员权限'
    });
};

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

// 获取按类别的销售统计
router.get('/category-sales', verifyToken(), salesReportController.getCategorySales);

// 获取库存状态报告
router.get('/inventory-status', verifyToken(), salesReportController.getInventoryStatus);

// 获取销售人员负责商品的销售业绩
router.get('/staff/:staffId/performance', verifyToken(), salesReportController.getStaffProductPerformance);

// 获取时间段的销售趋势
router.get('/sales-trend', verifyToken(), salesReportController.getSalesTrend);

// 获取畅销商品数据
router.get('/top-products', verifyToken(), salesReportController.getTopProducts);

module.exports = router;

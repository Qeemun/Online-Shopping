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

// 获取销售概览数据
router.get('/overview', verifyToken(), async (req, res) => {
    try {
        console.log('请求销售概览数据');
        const { startDate, endDate } = req.query;
        
        // 获取总销售额
        const totalRevenue = await salesReportController.getTotalSales(startDate, endDate);
        
        // 获取总订单数
        const totalOrdersResponse = await salesReportController.getTotalOrders(startDate, endDate);
        const totalOrders = totalOrdersResponse || 0;
        
        // 计算平均订单金额
        const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
          // 获取总销售数量
        const totalQuantityResponse = await salesReportController.getTotalQuantity(startDate, endDate);
        const totalQuantity = totalQuantityResponse || 0;
          
        // 创建一个与API请求结构相似的对象，以便内部调用
        const fakeTrendReq = { 
            query: { 
                startDate, 
                endDate, 
                period: 'day' 
            } 
        };
        
        // 获取销售趋势 - 使用正确的参数格式调用内部方法
        const salesTrend = await salesReportController.getSalesTrend(fakeTrendReq, null, true);
        
        res.json({
            success: true,
            summary: {
                totalRevenue,
                totalOrders,
                avgOrderValue,
                totalQuantity
            },
            salesTrend,
            totalRevenue,
            orderCount: totalOrders,
            totalQuantity
        });
    } catch (error) {
        console.error('获取销售概览数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取销售概览数据失败',
            error: error.message
        });
    }
});

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

// 获取销售概览数据 - 添加别名路由用于兼容前端
router.get('/sales-overview', verifyToken(), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        
        // 获取总销售额
        const totalRevenue = await salesReportController.getTotalSales(startDate, endDate);
        
        // 获取总订单数
        const totalOrders = await salesReportController.getTotalOrders(startDate, endDate) || 0;
          // 获取总销售数量
        const totalQuantity = await salesReportController.getTotalQuantity(startDate, endDate) || 0;
          
        // 创建一个与API请求结构相似的对象，以便内部调用
        const fakeTrendReq = { 
            query: { 
                startDate, 
                endDate, 
                period: 'day' 
            } 
        };
        
        // 获取销售趋势 - 使用正确的参数格式调用内部方法
        const salesTrend = await salesReportController.getSalesTrend(fakeTrendReq, null, true);
        
        res.json({
            success: true,
            totalRevenue,
            orderCount: totalOrders,
            totalQuantity,
            salesTrend
        });
    } catch (error) {
        console.error('获取销售概览失败：', error);
        res.status(500).json({
            success: false,
            message: '获取销售概览数据失败',
            error: error.message
        });
    }
});

// 获取所有商品类别列表
router.get('/category-list', verifyToken(), async (req, res) => {
    try {
        // 查询所有不同的商品类别
        const db = require('../models');
        const { Op } = db.Sequelize;
        
        console.log('开始查询商品类别列表...');
        
        const categories = await db.Product.findAll({
            attributes: [[db.sequelize.fn('DISTINCT', db.sequelize.col('category')), 'category']],
            where: {
                category: {
                    [Op.not]: null,
                    [Op.ne]: '' // 排除空类别
                }
            },
            raw: true
        });
        
        // 提取类别名称
        const categoryList = categories.map(item => item.category).filter(Boolean);
        console.log(`找到 ${categoryList.length} 个商品类别`);
        
        res.status(200).json({
            success: true,
            categories: categoryList
        });
    } catch (error) {
        console.error('获取类别列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取类别列表失败',
            error: error.message
        });
    }
});

module.exports = router;

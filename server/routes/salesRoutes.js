const express = require('express');
const router = express.Router();
const { authenticate, isSalesStaff } = require('../config/middleware/auth');
const salesStatsController = require('../controllers/salesStatsController');
const logController = require('../controllers/logController');

// 组合鉴权和销售人员权限检查
const salesAuth = [authenticate, isSalesStaff];

/**
 * 销售人员个人信息路由
 */
// 获取当前销售人员负责的产品
router.get('/my-products', salesAuth, async (req, res) => {
  // 重定向到销售人员详情API，传递当前用户ID
  return salesStatsController.getSalesStaffPerformance({
    ...req,
    params: { salesId: req.user.id }
  }, res);
});

// 获取销售人员摘要数据
router.get('/my-summary', salesAuth, async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    
    // 调用销售人员详情API获取基础数据
    const salesData = await salesStatsController.generateSalesSummary(req.user.id, todayStart, monthStart);
    
    res.json({
      success: true,
      summary: salesData
    });
  } catch (error) {
    console.error('获取销售摘要数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取销售摘要数据失败',
      error: error.message
    });
  }
});

/**
 * 销售统计和监控路由
 */
// 获取负责商品的销售状态
router.get('/my-categories/:categoryId/performance', salesAuth, async (req, res) => {
  // 这里我们可以验证该销售人员是否负责该类别，但为简化，直接调用现有控制器
  return salesStatsController.getCategoryPerformance(req, res);
});

// 获取低库存预警
router.get('/inventory-alerts', salesAuth, async (req, res) => {
  // 将销售人员ID添加到查询参数中
  req.query.salesId = req.user.id;
  return salesStatsController.getInventoryAlerts(req, res);
});

// 获取产品转化率
router.get('/conversion-report/:categoryId', salesAuth, salesStatsController.getConversionReport);

// 获取销售类别业绩数据
router.get('/categories/performance', salesAuth, async (req, res) => {
  return salesStatsController.getCategoryPerformanceForSales(req, res);
});

// 获取销售人员负责的类别
router.get('/assigned-categories/:salesId', salesAuth, async (req, res) => {
  return salesStatsController.getAssignedCategories(req, res);
});

// 获取销售人员负责的产品
router.get('/:salesId/products', salesAuth, async (req, res) => {
  return salesStatsController.getSalesStaffProducts(req, res);
});

/**
 * 销售日志查询路由
 */
// 获取负责产品的浏览记录
router.get('/logs/product-views', salesAuth, async (req, res) => {
  return logController.getSalesProductViewLogs({
    ...req,
    params: { salesId: req.user.id }
  }, res);
});

// 获取负责产品的购买记录
router.get('/logs/purchase', salesAuth, async (req, res) => {
  return logController.getSalesPurchaseLogs({
    ...req,
    params: { salesId: req.user.id }
  }, res);
});

// 获取个人活动日志
router.get('/logs/activity', salesAuth, async (req, res) => {
  // 确保只能查看自己的日志
  req.query.userId = req.user.id;
  return logController.getActivityLogs(req, res);
});

// 预测商品销售趋势 (仅限销售人员负责的产品)
router.get('/products/:productId/predict-sales', salesAuth, async (req, res) => {
  const { productId } = req.params;
  const salesId = req.user.id;
  
  try {
    // 检查产品是否由该销售人员负责
    const assignment = await db.SalesProductAssignment.findOne({
      where: { salesId, productId }
    });
    
    // 如果没有分配关系，则禁止访问
    if (!assignment) {
      return res.status(403).json({
        success: false,
        message: '您没有权限访问此产品的销售预测'
      });
    }
    
    // 如果有权限，调用预测控制器
    return salesStatsController.predictProductSalesTrend(req, res);
  } catch (error) {
    console.error('检查产品访问权限失败:', error);
    res.status(500).json({
      success: false,
      message: '检查产品访问权限失败',
      error: error.message
    });
  }
});

// 评估销售人员负责的类别销售趋势
router.get('/categories/:categoryId/evaluate-trend', salesAuth, async (req, res) => {
  const { categoryId } = req.params;
  const salesId = req.user.id;
  
  try {
    // 获取类别名称
    const categoryName = await CategoryHelper.getCategoryName(categoryId);
    if (!categoryName) {
      return res.status(404).json({
        success: false,
        message: '类别不存在'
      });
    }
    
    // 检查该销售人员是否负责此类别下的产品
    const products = await db.Product.findAll({
      where: { category: categoryName },
      attributes: ['id']
    });
    
    const productIds = products.map(p => p.id);
    
    const assignments = await db.SalesProductAssignment.findAll({
      where: { 
        salesId, 
        productId: { [Op.in]: productIds }
      }
    });
    
    // 如果没有分配关系，则禁止访问
    if (assignments.length === 0) {
      return res.status(403).json({
        success: false,
        message: '您没有权限访问此类别的销售趋势'
      });
    }
    
    // 如果有权限，调用评估控制器
    return salesStatsController.evaluateCategorySalesTrend(req, res);
  } catch (error) {
    console.error('检查类别访问权限失败:', error);
    res.status(500).json({
      success: false,
      message: '检查类别访问权限失败',
      error: error.message
    });
  }
});

module.exports = router;
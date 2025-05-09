// 用户浏览行为跟踪中间件
const db = require('../../models');

// 记录用户开始浏览某商品的记录
const trackUserView = async (req, res, next) => {
  // 仅处理获取商品详情的请求
  if (!req.path.match(/\/api\/products\/\d+/) || req.method !== 'GET') {
    return next();
  }
  
  try {
    // 确保用户已登录
    if (!req.user || !req.user.id) {
      return next();
    }
    
    const productId = parseInt(req.path.split('/').pop(), 10);
    if (isNaN(productId)) {
      return next();
    }
    
    // 查询商品以获取类别ID
    const product = await db.Product.findByPk(productId);
    if (!product) {
      return next();
    }
    
    // 创建浏览开始记录
    const browseLog = await db.BrowseLog.create({
      userId: req.user.id,
      productId: productId,
      categoryId: product.categoryId,
      startTime: new Date(),
      ipAddress: req.ip || req.connection.remoteAddress,
      userAgent: req.headers['user-agent']
    });
    
    // 在请求对象中存储浏览日志ID，以便在结束时更新
    req.browseLogId = browseLog.id;
    
    // 捕获响应结束事件
    res.on('finish', async () => {
      try {
        // 计算浏览时长并更新记录
        if (req.browseLogId) {
          const endTime = new Date();
          const log = await db.BrowseLog.findByPk(req.browseLogId);
          
          if (log) {
            const durationInSeconds = Math.round((endTime - new Date(log.startTime)) / 1000);
            
            await log.update({
              endTime: endTime,
              duration: durationInSeconds
            });
          }
        }
      } catch (error) {
        console.error('Error updating browse log duration:', error);
      }
    });
  } catch (error) {
    console.error('Error in trackUserView middleware:', error);
  }
  
  next();
};

// 手动记录浏览结束的方法（可通过前端AJAX调用）
const endUserView = async (req, res) => {
  try {
    const { browseLogId } = req.params;
    
    if (!browseLogId) {
      return res.status(400).json({ error: 'Missing browseLogId parameter' });
    }
    
    const log = await db.BrowseLog.findByPk(browseLogId);
    
    if (!log) {
      return res.status(404).json({ error: 'Browse log not found' });
    }
    
    // 验证此日志是否属于当前用户
    if (log.userId !== req.user.id) {
      return res.status(403).json({ error: 'Unauthorized access to browse log' });
    }
    
    const endTime = new Date();
    const durationInSeconds = Math.round((endTime - new Date(log.startTime)) / 1000);
    
    await log.update({
      endTime: endTime,
      duration: durationInSeconds
    });
    
    return res.status(200).json({ 
      success: true,
      duration: durationInSeconds
    });
  } catch (error) {
    console.error('Error ending user view:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  trackUserView,
  endUserView
};
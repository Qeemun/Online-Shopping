// 通用活动日志记录中间件
const activityLogger = (req, res, next) => {
  // 跳过日志记录的路径，如健康检查等
  const skipPaths = ['/api/health', '/api/public'];
  if (skipPaths.some(path => req.path.startsWith(path))) {
    return next();
  }

  const startTime = Date.now();
  
  // 捕获原始end方法
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    // 恢复原始end
    res.end = originalEnd;
    res.end(chunk, encoding);
    
    // 计算请求处理时间
    const duration = Date.now() - startTime;
    
    // 跳过记录静态资源或OPTIONS请求
    if (req.method === 'OPTIONS' || req.path.includes('.')) {
      return;
    }
    
    try {
      // 获取用户ID和角色
      const userId = req.user ? req.user.id : null;
      const role = req.user ? req.user.role : null;
      
      // 登录/注册请求特殊处理 - 不记录ActivityLog（因为此时还没有userId）
      if (req.path.includes('/login') || req.path.includes('/register')) {
        // 这些请求通过专门的LoginLog记录，不在这里处理
        return;
      }
      
      // 如果没有用户信息，跳过ActivityLog记录
      if (!userId) {
        return;
      }
      
      // 创建日志记录
      const db = require('../../models');
      db.ActivityLog.create({
        userId: userId, 
        role: role,
        action: req.method,
        module: req.path.split('/')[1] || 'api',
        description: `${req.method} ${req.path}`,
        details: {
          query: req.query,
          body: req.method !== 'GET' ? sanitizeBody(req.body) : {},
          params: req.params,
          status: res.statusCode,
          duration: duration
        },
        ipAddress: req.ip || req.connection.remoteAddress,
        timestamp: new Date(),
        status: res.statusCode >= 200 && res.statusCode < 400 ? 'success' : 'failed'
      }).catch(err => {
        console.error('Error logging activity:', err);
      });
    } catch (error) {
      console.error('Error in activity logger middleware:', error);
    }
  };
  
  next();
};

// 过滤敏感信息，如密码
function sanitizeBody(body) {
  if (!body) return {};
  
  const sanitized = { ...body };
  
  // 删除敏感字段
  const sensitiveFields = ['password', 'token', 'creditCard', 'cvv'];
  sensitiveFields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  });
  
  return sanitized;
}

module.exports = activityLogger;
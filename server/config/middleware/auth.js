/**
 * 认证中间件
 * 提供用户认证和权限验证功能
 */

const jwt = require('jsonwebtoken');
const db = require('../../models');
const User = db.User;

/**
 * 验证JWT令牌并将用户信息添加到请求对象
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      return res.status(401).json({ 
        success: false, 
        message: '未提供认证令牌' 
      });
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: '无效的认证令牌' 
      });
    }

    // 确保JWT密钥存在
    const jwtSecret = process.env.JWT_SECRET || 'mySuperSecretKey123!';

    let decoded;
    try {
      decoded = jwt.verify(token, jwtSecret);
    } catch (error) {
      console.error('Token验证失败:', error);
      return res.status(401).json({ 
        success: false, 
        message: 'Token验证失败' 
      });
    }

    if (!decoded.userId) {
      console.error('Token中没有用户ID');
      return res.status(401).json({ 
        success: false, 
        message: 'Token无效' 
      });
    }

    const user = await User.findByPk(decoded.userId);
    if (!user) {
      console.error('未找到用户:', decoded.userId);
      return res.status(401).json({ 
        success: false, 
        message: '用户不存在' 
      });
    }

    req.user = user;
    req.userId = decoded.userId;
    req.token = token;
    next();
  } catch (error) {
    console.error('认证错误:', error);
    res.status(401).json({ 
      success: false, 
      message: '认证失败', 
      error: error.message 
    });
  }
};

/**
 * 检查是否为管理员
 */
const isAdmin = (req, res, next) => {
  if (req.user && req.user.role === 'admin') {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: '需要管理员权限'
    });
  }
};

/**
 * 检查是否为销售人员
 */
const isSalesStaff = (req, res, next) => {
  if (req.user && (req.user.role === 'sales' || req.user.role === 'seller' || req.user.role === 'salesStaff')) {
    next();
  } else {
    return res.status(403).json({
      success: false,
      message: '需要销售人员权限'
    });
  }
};

/**
 * 检查是否有权限访问特定资源
 */
const hasResourceAccess = (req, res, next) => {
  const resourceId = req.params.id || req.params.salesId || req.params.userId;
  const userId = req.userId;
  
  // 管理员可以访问所有资源
  if (req.user.role === 'admin') {
    return next();
  }
  
  // 用户只能访问自己的资源
  if (resourceId && userId && resourceId == userId) {
    return next();
  }
  
  return res.status(403).json({
    success: false,
    message: '无权访问此资源'
  });
};

/**
 * 处理用户登录
 */
const login = async (req, res, user, token) => {
  try {
    // 记录登录日志
    await logUserSession(req, user, 'login');
    
    return res.status(200).json({
      success: true,
      message: '登录成功',
      data: {
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (error) {
    console.error('登录处理失败:', error);
    return res.status(500).json({
      success: false,
      message: '登录过程中发生错误',
      error: error.message
    });
  }
};

/**
 * 处理用户登出
 */
const logout = async (req, res) => {
  try {
    if (req.user) {
      // 记录登出日志
      await logUserSession(req, req.user, 'logout');
    }
    
    return res.status(200).json({
      success: true,
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出处理失败:', error);
    return res.status(500).json({
      success: false,
      message: '登出过程中发生错误',
      error: error.message
    });
  }
};

// 导出所有功能
module.exports = {
  authenticate,
  isAdmin,
  isSalesStaff,
  hasResourceAccess,
  login,
  logout
};

// 为了向后兼容，将authenticate作为默认导出
module.exports.default = authenticate;
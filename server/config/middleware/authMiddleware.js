const jwt = require('jsonwebtoken');
const db = require('../../models'); 
const User = db.User;       

// 验证令牌
exports.verifyToken = async (req, res, next) => {
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

// 验证是否为管理员
exports.isAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: '需要管理员权限'
        });
    }
};

// 验证是否为销售人员
exports.isSalesStaff = (req, res, next) => {
    if (req.user && (req.user.role === 'sales' || req.user.role === 'seller' || req.user.role === 'salesStaff')) {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: '需要销售人员权限'
        });
    }
};

// 验证用户是否有权限访问特定资源
exports.hasResourceAccess = (req, res, next) => {
    const resourceId = req.params.id || req.params.salesId;
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
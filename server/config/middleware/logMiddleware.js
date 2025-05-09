const db = require('../../models');
const ActivityLog = db.ActivityLog;
const LoginLog = db.LoginLog;
const productviewlogs = db.productviewlogs;

// 记录用户活动
exports.logUserActivity = async (req, res, next) => {
    try {
        // 只记录已登录用户的活动
        if (!req.user || !req.user.id) {
            return next();
        }

        // 只记录GET和POST请求
        if (!['GET', 'POST'].includes(req.method)) {
            return next();
        }

        // 获取路径中的产品ID（如果有）
        let productId = null;
        if (req.originalUrl.includes('/products/') && !req.originalUrl.includes('/products/category')) {
            const matches = req.originalUrl.match(/\/products\/(\d+)/);
            if (matches && matches[1]) {
                productId = parseInt(matches[1]);
            }
        } else if (req.body && req.body.productId) {
            productId = req.body.productId;
        }

        // 确定活动类型
        let action = 'view';
        if (req.originalUrl.includes('/cart') && req.method === 'POST') {
            action = 'view'; // 加入购物车也算查看
        } else if (req.originalUrl.includes('/orders') && req.method === 'POST') {
            action = 'purchase'; // 创建订单视为购买
        } else if (productId && req.method === 'GET') {
            action = 'view'; // 查看产品详情
        }

        // 创建活动日志
        await ActivityLog.create({
            userId: req.user.id,
            productId,
            action,
            ipAddress: req.ip || req.connection.remoteAddress
        });

        next();
    } catch (error) {
        console.error('记录用户活动失败:', error);
        next(); // 即使日志记录失败，也继续执行请求
    }
};


// 记录停留时间（通过前端心跳实现）
exports.logStayDuration = async (req, res) => {
    try {
        const { userId, productId, durationSeconds } = req.body;
        
        if (!userId || !productId || !durationSeconds) {
            return res.status(400).json({
                success: false,
                message: '缺少必要参数'
            });
        }
        
        await ActivityLog.create({
            userId,
            productId,
            action: 'stay',
            durationSeconds,
            ipAddress: req.ip || req.connection.remoteAddress
        });
        
        res.status(200).json({
            success: true,
            message: '记录停留时间成功'
        });
    } catch (error) {
        console.error('记录停留时间失败:', error);
        res.status(500).json({
            success: false,
            message: '记录停留时间出错',
            error: error.message
        });
    }
};
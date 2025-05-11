const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../models');  
const User = db.User;
const UserProfile = db.UserProfile;
const LoginLog = db.LoginLog; // 添加LoginLog引入
const { Op } = db.Sequelize;

// 用户注册
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 检查用户名和邮箱是否已经存在
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: '该邮箱已被使用' 
            });
        }

        const newUser = await User.create({ username, email, password });
        res.status(201).json({ 
            success: true, 
            message: '注册成功' 
        });
    } catch (error) {
        console.error('注册失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '注册用户时出错',
            error: error.message 
        });
    }
};

// 用户登录
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ 
            success: false, 
            message: "邮箱和密码不能为空" 
        });
    }

    try {
        const user = await User.findOne({ 
            where: { email },
            attributes: ['id', 'username', 'email', 'password', 'role']
        });

        if (!user) {
            return res.status(400).json({ 
                success: false, 
                message: "用户不存在" 
            });
        }

        const isMatch = await user.validatePassword(password);
        if (!isMatch) {
            return res.status(400).json({ 
                success: false, 
                message: "密码错误" 
            });
        }

        // 确保JWT密钥存在
        const jwtSecret = process.env.JWT_SECRET || 'mySuperSecretKey123!';
        console.log('JWT密钥状态:', jwtSecret ? '已设置' : '未设置');

        const token = jwt.sign(
            { userId: user.id, role: user.role }, 
            jwtSecret, 
            { expiresIn: '1h' }
        );

        // 记录登录日志
        await LoginLog.create({
            userId: user.id,
            role: user.role, 
            action: 'login',
            ipAddress: req.ip || req.connection.remoteAddress,
            userAgent: req.headers['user-agent'],
            sessionId: req.sessionID // 修正：使用正确的sessionID属性
        });

        res.json({
            success: true,
            message: '登录成功',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("登录时出错:", error);
        res.status(500).json({ 
            success: false, 
            message: "服务器错误",
            error: error.message 
        });
    }
};

exports.verifyToken = (requiredRole) => {
    return (req, res, next) => {
        // 始终设置Content-Type为application/json
        res.setHeader('Content-Type', 'application/json');
        
        const token = req.headers['authorization']?.split(' ')[1]; // 获取 Authorization 头中的 token

        if (!token) {
            return res.status(403).json({ success: false, message: '未提供token' });
        }

        // 确保JWT密钥存在
        const jwtSecret = process.env.JWT_SECRET || 'mySuperSecretKey123!';

        jwt.verify(token, jwtSecret, async (err, decoded) => {  // 使用环境变量中的 JWT 密钥
            if (err) {
                return res.status(401).json({ success: false, message: '授权已超时，请重新登录' });
            }
            

            req.userId = decoded.userId; // 将用户 ID 存入请求中，供后续操作使用
            req.role = decoded.role;  // 将用户角色存入请求中
            
            // 添加用户对象到请求中
            req.user = {
                id: decoded.userId,
                role: decoded.role
            };

            // 检查用户角色是否符合要求
            if (requiredRole && req.role !== requiredRole) {
                return res.status(403).json({ success: false, message: '权限不足' });
            }

            next();
        });
    };
};

// 获取当前用户信息
exports.getUserProfile = async (req, res) => {
    try {
        const userId = req.userId;  // 从 JWT 中获取用户 ID
        const user = await User.findByPk(userId);  // 根据 ID 查找用户

        if (!user) {
            return res.status(404).json({ 
            success: false, 
            message: '授权已超时，请重新登录',
            logout: true // 告诉前端需要注销
            });
        }

        // 返回用户信息（你可以根据需要选择返回哪些字段）
        res.json({
            username: user.username,
            email: user.email,
            role: user.role
        });
    } catch (error) {
        res.status(500).json({ success: false, message: '获取用户资料时出错' });
    }
};

// 用户注销
exports.logout = async (req, res) => {
    try {
        // 如果用户已登录，记录注销日志
        if (req.userId) {
            await LoginLog.create({
                userId: req.userId,
                role: req.role, 
                action: 'logout',
                ipAddress: req.ip || req.connection.remoteAddress,
                userAgent: req.headers['user-agent'],
                sessionId: req.sessionID || null
            });
            
            // 注意：不要在这里创建ActivityLog，使用LoginLog即可
        }
        
        // 客户端可以通过删除或禁用 token 来实现注销
        res.json({ success: true, message: '注销成功' });
    } catch (error) {
        console.error("注销时出错:", error);
        res.status(500).json({ 
            success: false, 
            message: "服务器错误",
            error: error.message 
        });
    }
};

// 获取用户画像
exports.getUserProfileDetails = async (req, res) => {
    try {
        const userId = req.params.userId || req.userId;
        
        // 查询用户基本信息
        const user = await User.findByPk(userId, {
            attributes: ['id', 'username', 'email', 'role', 'createdAt'],
            include: [{
                model: UserProfile,
                attributes: ['region', 'totalSpent', 'favoriteCategory', 'phone', 'address', 'fullName', 'profileComplete']
            }]
        });
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        
        // 获取用户消费统计
        const orderStats = await db.Order.findAll({
            where: { userId },
            attributes: [
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'orderCount'],
                [db.sequelize.fn('SUM', db.sequelize.col('totalAmount')), 'totalSpent'],
                [db.sequelize.fn('AVG', db.sequelize.col('totalAmount')), 'avgOrderValue'],
                [db.sequelize.fn('MAX', db.sequelize.col('createdAt')), 'lastOrderDate']
            ]
        });
        
        // 获取用户所有订单，用于分析购买频率和价格敏感度
        const orders = await db.Order.findAll({
            where: { userId, status: 'completed' },
            attributes: ['id', 'totalAmount', 'createdAt'],
            order: [['createdAt', 'DESC']],
            limit: 20
        });
        
        // 获取用户的商品浏览记录
        const productViews = await db.sequelize.models.ProductViewLog.findAll({
            where: { userId },
            attributes: ['productId', 'durationSeconds', 'createdAt'],
            include: [{
                model: db.Product,
                as: 'product',
                attributes: ['name', 'price', 'category']
            }],
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        
        // 计算用户购买行为特征
        let purchaseFrequency = 'low'; // 低频率
        let priceSegment = 'medium'; // 中等价格段
        let lifetimeValue = 0;
        let daysFromLastPurchase = null;
        let activityTimePattern = 'unknown';
        
        // 计算购买频率
        if (orders.length >= 2) {
            const purchaseDates = orders.map(o => new Date(o.createdAt));
            const timeDiffs = [];
            
            // 计算订单之间的时间间隔
            for(let i = 1; i < purchaseDates.length; i++) {
                const diff = purchaseDates[i-1].getTime() - purchaseDates[i].getTime();
                timeDiffs.push(diff / (1000 * 60 * 60 * 24)); // 转换为天数
            }
            
            // 计算平均购买间隔
            const avgTimeBetweenOrders = timeDiffs.reduce((a, b) => a + b, 0) / timeDiffs.length;
            if (avgTimeBetweenOrders <= 30) purchaseFrequency = 'high'; // 平均一个月内
            else if (avgTimeBetweenOrders <= 90) purchaseFrequency = 'medium'; // 平均三个月内
            
            // 计算客户终身价值 (LTV)
            lifetimeValue = parseFloat(orderStats[0]?.dataValues.totalSpent) || 0;
            
            // 计算距离最后一次购买的天数
            if (orders.length > 0) {
                const lastOrderDate = new Date(orders[0].createdAt);
                const today = new Date();
                daysFromLastPurchase = Math.round((today - lastOrderDate) / (1000 * 60 * 60 * 24));
            }
            
            // 分析活跃时段
            const purchaseHours = orders.map(o => new Date(o.createdAt).getHours());
            const morningOrders = purchaseHours.filter(h => h >= 6 && h < 12).length;
            const afternoonOrders = purchaseHours.filter(h => h >= 12 && h < 18).length;
            const eveningOrders = purchaseHours.filter(h => h >= 18 && h < 24).length;
            const nightOrders = purchaseHours.filter(h => h >= 0 && h < 6).length;
            
            // 确定主要活动时段
            const timeSlots = [
                { name: 'morning', count: morningOrders },
                { name: 'afternoon', count: afternoonOrders },
                { name: 'evening', count: eveningOrders },
                { name: 'night', count: nightOrders }
            ];
            
            // 找出数量最多的时段
            const mainTimeSlot = timeSlots.reduce((max, slot) => max.count > slot.count ? max : slot);
            if (mainTimeSlot.count > 0) {
                activityTimePattern = mainTimeSlot.name;
            }
            
            // 根据平均订单金额确定价格区间
            const avgOrderValue = parseFloat(orderStats[0]?.dataValues.avgOrderValue) || 0;
            if (avgOrderValue <= 100) priceSegment = 'low';
            else if (avgOrderValue <= 500) priceSegment = 'medium';
            else priceSegment = 'high';
        }
        
        // 获取用户类别偏好
        const orderItems = await db.OrderItem.findAll({
            include: [
                { 
                    model: db.Order,
                    where: { userId },
                    attributes: []
                },
                {
                    model: db.Product,
                    attributes: ['category']
                }
            ]
        });
        
        // 统计类别购买频率
        const categoryCount = {};
        orderItems.forEach(item => {
            const category = item.product?.category;
            if (category) {
                categoryCount[category] = (categoryCount[category] || 0) + 1;
            }
        });
        
        // 转换为数组并排序
        const categoryPreference = Object.entries(categoryCount)
            .map(([category, count]) => ({ category, count }))
            .sort((a, b) => b.count - a.count);
        
        // 整合用户画像数据
        const userProfile = {
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role,
                createdAt: user.createdAt
            },
            profile: user.UserProfile || { 
                region: null, 
                totalSpent: orderStats[0]?.dataValues.totalSpent || 0,
                favoriteCategory: null,
                fullName: null,
                phone: null,
                address: null,
                profileComplete: false
            },            stats: {
                orderCount: orderStats[0]?.dataValues.orderCount || 0,
                totalSpent: orderStats[0]?.dataValues.totalSpent || 0,
                avgOrderValue: orderStats[0]?.dataValues.avgOrderValue || 0,
                lastOrderDate: orderStats[0]?.dataValues.lastOrderDate || null,
                purchaseFrequency: purchaseFrequency,
                priceSegment: priceSegment,
                daysFromLastPurchase: daysFromLastPurchase,
                activityTimePattern: activityTimePattern,
                lifetimeValue: lifetimeValue,
                categoryPreference: categoryPreference
            },
            behaviorMetrics: {
                engagementScore: calculateEngagementScore(productViews, orders),
                loyaltyIndex: calculateLoyaltyIndex(orders, daysFromLastPurchase),
                priceElasticity: calculatePriceElasticity(orders),
                churnRisk: calculateChurnRisk(daysFromLastPurchase, purchaseFrequency)
            },
            recentActivities: productViews.slice(0, 10).map(view => ({
                type: 'view',
                productName: view.product.name,
                productCategory: view.product.category,
                durationSeconds: view.durationSeconds,
                timestamp: view.createdAt
            }))
        };
        
        res.status(200).json({
            success: true,
            userProfile
        });
    } catch (error) {
        console.error('获取用户画像失败:', error);
        res.status(500).json({
            success: false,
            message: '获取用户画像时出错',
            error: error.message
        });
    }
};

// 更新用户画像
exports.updateUserProfile = async (req, res) => {
    try {
        const userId = req.params.userId || req.userId;
        const { region } = req.body;
        
        let userProfile = await UserProfile.findByPk(userId);
        
        if (userProfile) {
            // 更新现有画像
            await userProfile.update({ region });
        } else {
            // 创建新画像
            userProfile = await UserProfile.create({
                userId,
                region
            });
        }
        
        res.status(200).json({
            success: true,
            message: '用户画像更新成功',
            userProfile
        });
    } catch (error) {
        console.error('更新用户画像失败:', error);
        res.status(500).json({
            success: false,
            message: '更新用户画像时出错',
            error: error.message
        });
    }
};

// 更新用户偏好类别
exports.updateFavoriteCategory = async (req, res) => {
    try {
        const userId = req.params.userId || req.userId;
        const { favoriteCategory } = req.body;
        
        let userProfile = await UserProfile.findByPk(userId);
        
        if (userProfile) {
            await userProfile.update({ favoriteCategory });
        } else {
            userProfile = await UserProfile.create({
                userId,
                favoriteCategory
            });
        }
        
        res.status(200).json({
            success: true,
            message: '偏好类别更新成功',
            userProfile
        });
    } catch (error) {
        console.error('更新偏好类别失败:', error);
        res.status(500).json({
            success: false,
            message: '更新偏好类别时出错',
            error: error.message
        });
    }
};

// 移除获取用户会话日志功能

// 获取用户统计信息
exports.getUserStats = async (req, res) => {
    try {
        // 用户总数
        const totalUsers = await User.count();
        
        // 今日新增用户
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const newUsersToday = await User.count({
            where: {
                createdAt: {
                    [Op.gte]: today
                }
            }
        });
        
        // 近30天用户增长趋势
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        
        const userGrowthTrend = await User.findAll({
            attributes: [
                [db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'date'],
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
            ],
            where: {
                createdAt: {
                    [Op.gte]: last30Days
                }
            },
            group: [db.sequelize.fn('DATE', db.sequelize.col('createdAt'))],
            order: [[db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'ASC']]
        });
        
        // 用户角色分布
        const roleDistribution = await User.findAll({
            attributes: [
                'role',
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
            ],
            group: ['role']
        });
        
        res.status(200).json({
            success: true,
            stats: {
                totalUsers,
                newUsersToday,
                userGrowthTrend,
                roleDistribution
            }
        });
    } catch (error) {
        console.error('获取用户统计失败:', error);
        res.status(500).json({
            success: false,
            message: '获取用户统计时出错',
            error: error.message
        });
    }
};

// 获取所有客户数据
exports.getAllCustomers = async (req, res) => {
    try {
        const customers = await User.findAll({
            where: { role: 'customer' },
            attributes: ['id', 'username', 'email', 'createdAt', 'isActive'],
            order: [['createdAt', 'DESC']]
        });

        res.json({
            success: true,
            customers
        });
    } catch (error) {
        console.error('获取客户数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取客户数据时出错',
            error: error.message
        });
    }
};

// 获取单个客户信息
exports.getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;
        
        const customer = await User.findOne({
            where: { 
                id,
                role: 'customer'
            },
            attributes: ['id', 'username', 'email', 'createdAt', 'isActive'],
            include: [{
                model: db.UserProfile,
                as: 'profile',
                attributes: ['phone', 'address', 'favoriteCategory']
            }]
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: '客户不存在'
            });
        }

        res.json({
            success: true,
            customer
        });
    } catch (error) {
        console.error('获取客户信息失败:', error);
        res.status(500).json({
            success: false,
            message: '获取客户信息时出错',
            error: error.message
        });
    }
};

// 更新客户信息
exports.updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, email, isActive } = req.body;
        
        const customer = await User.findOne({
            where: { 
                id,
                role: 'customer'
            }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: '客户不存在'
            });
        }

        // 更新用户基本信息
        await customer.update({
            username,
            email,
            isActive
        });

        res.json({
            success: true,
            message: '客户信息已更新',
            customer: {
                id: customer.id,
                username: customer.username,
                email: customer.email,
                isActive: customer.isActive
            }
        });
    } catch (error) {
        console.error('更新客户信息失败:', error);
        res.status(500).json({
            success: false,
            message: '更新客户信息时出错',
            error: error.message
        });
    }
};

// 删除客户
exports.deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;
        
        const customer = await User.findOne({
            where: { 
                id,
                role: 'customer'
            }
        });

        if (!customer) {
            return res.status(404).json({
                success: false,
                message: '客户不存在'
            });
        }

        // 执行软删除 - 将用户标记为非活跃而不是物理删除
        await customer.update({ isActive: false });

        res.json({
            success: true,
            message: '客户已删除'
        });
    } catch (error) {
        console.error('删除客户失败:', error);
        res.status(500).json({
            success: false,
            message: '删除客户时出错',
            error: error.message
        });
    }
};

// 计算用户参与度评分 (0-100)
function calculateEngagementScore(productViews, orders) {
    // 基本分数: 从0开始
    let score = 0;
    
    // 根据商品浏览记录评分 (最多40分)
    if (productViews && productViews.length > 0) {
        // 浏览记录数量给分
        score += Math.min(productViews.length, 20) * 1.5;
        
        // 浏览时长奖励 (超过30秒的浏览加分，最多10分)
        const longViews = productViews.filter(v => v.durationSeconds >= 30).length;
        score += Math.min(longViews, 10);
    }
    
    // 根据订单记录评分 (最多60分)
    if (orders && orders.length > 0) {
        // 订单数量给分
        score += Math.min(orders.length, 10) * 4;
        
        // 最近订单加分 (30天内有订单加20分)
        const now = new Date();
        const recentOrderCount = orders.filter(order => {
            const orderDate = new Date(order.createdAt);
            const diffDays = (now - orderDate) / (1000 * 60 * 60 * 24);
            return diffDays <= 30;
        }).length;
        
        if (recentOrderCount > 0) {
            score += 20;
        }
    }
    
    // 确保分数在0-100之间
    return Math.min(Math.max(Math.round(score), 0), 100);
}

// 计算用户忠诚度指数 (0-100)
function calculateLoyaltyIndex(orders, daysFromLastPurchase) {
    // 如果没有订单，忠诚度为0
    if (!orders || orders.length === 0) {
        return 0;
    }
    
    let score = 0;
    
    // 订单频率得分 (最多40分)
    score += Math.min(orders.length, 10) * 4;
    
    // 最近购买行为得分 (最多60分)
    // 一周内购买: 60分
    // 一月内购买: 40分
    // 三月内购买: 20分
    // 超过三月: 10分
    // 超过六月: 5分
    // 超过一年: 0分
    if (daysFromLastPurchase <= 7) {
        score += 60;
    } else if (daysFromLastPurchase <= 30) {
        score += 40;
    } else if (daysFromLastPurchase <= 90) {
        score += 20;
    } else if (daysFromLastPurchase <= 180) {
        score += 10;
    } else if (daysFromLastPurchase <= 365) {
        score += 5;
    }
    
    // 确保分数在0-100之间
    return Math.min(Math.max(Math.round(score), 0), 100);
}

// 计算用户价格弹性 (0-1，值越低价格敏感度越高)
function calculatePriceElasticity(orders) {
    // 如果订单少于2个，无法计算弹性，返回中等值
    if (!orders || orders.length < 2) {
        return 0.5;
    }
    
    // 计算订单金额的标准差
    const amounts = orders.map(o => o.totalAmount);
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const variance = amounts.reduce((a, b) => a + Math.pow(b - avgAmount, 2), 0) / amounts.length;
    const stdDeviation = Math.sqrt(variance);
    
    // 标准差与平均值的比率 (变异系数)
    const variationCoeff = stdDeviation / avgAmount;
    
    // 变异系数越大，说明价格弹性越高(价格敏感度越高)
    // 将变异系数映射到0-1区间，并反转，使得结果值越低表示价格敏感度越高
    return Math.max(0, Math.min(1, 1 - Math.min(variationCoeff, 1)));
}

// 计算用户流失风险 (0-100，值越高表示风险越大)
function calculateChurnRisk(daysFromLastPurchase, purchaseFrequency) {
    // 如果没有购买过，设定较高的风险
    if (daysFromLastPurchase === null) {
        return 70;
    }
    
    let riskScore = 0;
    
    // 根据最后购买时间计算基础风险分
    if (daysFromLastPurchase <= 30) {
        riskScore += 10; // 最近一个月内购买，风险低
    } else if (daysFromLastPurchase <= 90) {
        riskScore += 30; // 1-3个月内购买，风险中等
    } else if (daysFromLastPurchase <= 180) {
        riskScore += 60; // 3-6个月内购买，风险较高
    } else {
        riskScore += 80; // 超过6个月未购买，风险很高
    }
    
    // 根据购买频率调整风险分
    switch(purchaseFrequency) {
        case 'high':
            riskScore -= 20; // 高频购买用户流失风险降低
            break;
        case 'medium':
            riskScore -= 10; // 中频购买用户流失风险略微降低
            break;
        case 'low':
            riskScore += 10; // 低频购买用户流失风险增加
            break;
    }
    
    // 确保分数在0-100之间
    return Math.min(Math.max(Math.round(riskScore), 0), 100);
}

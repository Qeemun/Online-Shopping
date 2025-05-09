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
                attributes: ['region', 'totalSpent', 'favoriteCategory']
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
                [db.sequelize.fn('SUM', db.sequelize.col('totalAmount')), 'totalSpent']
            ]
        });
        
        // 移除用户活动日志相关代码
        
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
                favoriteCategory: null
            },
            stats: {
                orderCount: orderStats[0]?.dataValues.orderCount || 0,
                totalSpent: orderStats[0]?.dataValues.totalSpent || 0,
                lastActivity: null,
                categoryPreference: []
            },
            recentActivities: []
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

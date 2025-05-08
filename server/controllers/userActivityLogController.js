const db = require('../models');
const User = db.User;
const UserActivityLog = db.UserActivityLog;
const Product = db.Product;
const Op = db.Sequelize.Op;

// 获取所有客户
exports.getAllCustomers = async (req, res) => {
    try {
        const customers = await User.findAll({
            attributes: ['id', 'username', 'email']
        });
        res.status(200).json({ success: true, customers });
    } catch (error) {
        console.error('获取客户列表失败:', error);
        res.status(500).json({ success: false, message: '获取客户列表失败' });
    }
};

// 获取单个客户信息
exports.getCustomerDetails = async (req, res) => {
    try {
        const customer = await User.findByPk(req.params.customerId, {
            attributes: ['id', 'username', 'email']
        });
        if (!customer) {
            return res.status(404).json({ success: false, message: '客户未找到' });
        }
        res.status(200).json({ success: true, customer });
    } catch (error) {
        console.error('获取客户信息失败:', error);
        res.status(500).json({ success: false, message: '获取客户信息失败' });
    }
};

// 添加新客户
exports.addCustomer = async (req, res) => {
    try {
        const { username, email, password } = req.body;
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: '该邮箱已被使用' });
        }
        const newUser = await User.create({ username, email, password });
        res.status(201).json({ success: true, message: '客户添加成功', user: newUser });
    } catch (error) {
        console.error('添加客户失败:', error);
        res.status(500).json({ success: false, message: '添加客户失败' });
    }
};

// 更新客户信息
exports.updateCustomer = async (req, res) => {
    try {
        const customer = await User.findByPk(req.params.customerId);
        if (!customer) {
            return res.status(404).json({ success: false, message: '客户未找到' });
        }
        const { username, email } = req.body;
        await customer.update({ username, email });
        res.status(200).json({ success: true, message: '客户更新成功', customer });
    } catch (error) {
        console.error('更新客户失败:', error);
        res.status(500).json({ success: false, message: '更新客户失败' });
    }
};

// 删除客户
exports.deleteCustomer = async (req, res) => {
    try {
        const customer = await User.findByPk(req.params.customerId);
        if (!customer) {
            return res.status(404).json({ success: false, message: '客户未找到' });
        }
        await customer.destroy();
        res.status(200).json({ success: true, message: '客户删除成功' });
    } catch (error) {
        console.error('删除客户失败:', error);
        res.status(500).json({ success: false, message: '删除客户失败' });
    }
};

// 获取用户活动日志
exports.getUserActivityLogs = async (req, res) => {
    try {
        const logs = await UserActivityLog.findAll({
            where: { userId: req.params.customerId },
            include: [
                { model: User, attributes: ['id', 'username', 'email'] },
                { model: Product, attributes: ['id', 'name', 'price'] }
            ]
        });
        res.status(200).json({ success: true, logs });
    } catch (error) {
        console.error('获取用户活动日志失败:', error);
        res.status(500).json({ success: false, message: '获取用户活动日志失败' });
    }
};

// 添加用户活动日志
exports.addUserActivityLog = async (req, res) => {
    try {
        const { userId, productId, action, durationSeconds, ipAddress } = req.body;
        
        const log = await UserActivityLog.create({
            userId,
            productId,
            action,
            durationSeconds,
            ipAddress
        });
        
        res.status(201).json({ success: true, message: '活动日志添加成功', log });
    } catch (error) {
        console.error('添加活动日志失败:', error);
        res.status(500).json({ success: false, message: '添加活动日志失败', error: error.message });
    }
};

// 获取特定产品的用户活动统计
exports.getProductActivityStats = async (req, res) => {
    try {
        const { productId } = req.params;
        
        const viewStats = await UserActivityLog.findAndCountAll({
            where: { 
                productId,
                action: 'view'
            }
        });
        
        const purchaseStats = await UserActivityLog.findAndCountAll({
            where: { 
                productId,
                action: 'purchase'
            }
        });
        
        const stayStats = await UserActivityLog.findAndCountAll({
            where: { 
                productId,
                action: 'stay'
            },
            attributes: [
                [db.sequelize.fn('AVG', db.sequelize.col('durationSeconds')), 'avgDuration']
            ]
        });
        
        res.status(200).json({
            success: true,
            stats: {
                views: viewStats.count,
                purchases: purchaseStats.count,
                avgStayDuration: stayStats.rows[0]?.dataValues.avgDuration || 0
            }
        });
    } catch (error) {
        console.error('获取产品活动统计失败:', error);
        res.status(500).json({ success: false, message: '获取产品活动统计失败', error: error.message });
    }
};

// 获取销售人员负责商品的用户活动日志
exports.getSalesProductLogs = async (req, res) => {
    try {
        const userId = req.userId;
        const { 
            category, 
            action, 
            startDate, 
            endDate, 
            page = 1, 
            limit = 20 
        } = req.query;
        
        // 验证是否为销售人员或管理员
        if (req.user.role !== 'sales' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '无权访问此资源'
            });
        }
        
        // 查找销售人员负责的产品
        const SalesProductAssignment = db.sequelize.models.SalesProductAssignment;
        let productIds = [];
        
        // 如果是销售人员，只能查看自己负责的产品
        if (req.user.role === 'sales') {
            const assignments = await SalesProductAssignment.findAll({
                where: { salesId: userId }
            });
            
            if (assignments.length === 0) {
                return res.status(200).json({
                    success: true,
                    logs: [],
                    pagination: {
                        total: 0,
                        page: parseInt(page),
                        limit: parseInt(limit),
                        totalPages: 0
                    }
                });
            }
            
            productIds = assignments.map(assignment => assignment.productId);
        }
        
        // 构建查询条件
        const whereCondition = {};
        
        // 如果是销售人员，限制只能查看自己负责的产品
        if (req.user.role === 'sales') {
            whereCondition.productId = {
                [Op.in]: productIds
            };
        }
        
        // 按活动类型筛选
        if (action) {
            whereCondition.action = action;
        }
        
        // 按日期范围筛选
        if (startDate || endDate) {
            whereCondition.createdAt = {};
            
            if (startDate) {
                whereCondition.createdAt[Op.gte] = new Date(startDate);
            }
            
            if (endDate) {
                const endDateObj = new Date(endDate);
                endDateObj.setDate(endDateObj.getDate() + 1); // 包含结束日期当天
                whereCondition.createdAt[Op.lt] = endDateObj;
            }
        }
        
        // 按类别筛选（需要联合查询Product表）
        const includeOptions = [{
            model: db.User,
            as: 'user',
            attributes: ['id', 'username', 'email']
        }, {
            model: db.Product,
            as: 'product',
            attributes: ['id', 'name', 'category']
        }];
        
        if (category) {
            includeOptions[1].where = { category };
        }
        
        // 计算分页参数
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        // 查询总数
        const total = await UserActivityLog.count({
            where: whereCondition,
            include: includeOptions
        });
        
        // 获取日志
        const logs = await UserActivityLog.findAll({
            where: whereCondition,
            include: includeOptions,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset
        });
        
        res.status(200).json({
            success: true,
            logs,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('获取销售人员产品活动日志失败:', error);
        res.status(500).json({
            success: false,
            message: '获取活动日志失败',
            error: error.message
        });
    }
};

// 获取销售人员负责商品的用户活动统计
exports.getSalesProductStats = async (req, res) => {
    try {
        const userId = req.userId;
        const { category, startDate, endDate } = req.query;
        
        // 验证是否为销售人员或管理员
        if (req.user.role !== 'sales' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '无权访问此资源'
            });
        }
        
        // 查找销售人员负责的产品
        const SalesProductAssignment = db.sequelize.models.SalesProductAssignment;
        let productIds = [];
        
        // 如果是销售人员，只能查看自己负责的产品
        if (req.user.role === 'sales') {
            const assignments = await SalesProductAssignment.findAll({
                where: { salesId: userId }
            });
            
            if (assignments.length === 0) {
                return res.status(200).json({
                    success: true,
                    stats: {
                        viewCount: 0,
                        purchaseCount: 0,
                        stayCount: 0,
                        totalDuration: 0
                    }
                });
            }
            
            productIds = assignments.map(assignment => assignment.productId);
        }
        
        // 构建查询条件
        const whereCondition = {};
        
        // 如果是销售人员，限制只能查看自己负责的产品
        if (req.user.role === 'sales') {
            whereCondition.productId = {
                [Op.in]: productIds
            };
        }
        
        // 按日期范围筛选
        if (startDate || endDate) {
            whereCondition.createdAt = {};
            
            if (startDate) {
                whereCondition.createdAt[Op.gte] = new Date(startDate);
            }
            
            if (endDate) {
                const endDateObj = new Date(endDate);
                endDateObj.setDate(endDateObj.getDate() + 1); // 包含结束日期当天
                whereCondition.createdAt[Op.lt] = endDateObj;
            }
        }
        
        // 按类别筛选（需要联合查询Product表）
        const includeOptions = [{
            model: db.Product,
            as: 'product',
            attributes: ['id', 'category']
        }];
        
        if (category) {
            includeOptions[0].where = { category };
        }
        
        // 获取浏览次数
        const viewCount = await UserActivityLog.count({
            where: {
                ...whereCondition,
                action: 'view'
            },
            include: includeOptions
        });
        
        // 获取购买次数
        const purchaseCount = await UserActivityLog.count({
            where: {
                ...whereCondition,
                action: 'purchase'
            },
            include: includeOptions
        });
        
        // 获取停留记录
        const stayLogs = await UserActivityLog.findAll({
            where: {
                ...whereCondition,
                action: 'stay',
                durationSeconds: {
                    [Op.not]: null
                }
            },
            attributes: ['durationSeconds'],
            include: includeOptions
        });
        
        // 计算总停留时间和停留次数
        const stayCount = stayLogs.length;
        const totalDuration = stayLogs.reduce((total, log) => {
            return total + (log.durationSeconds || 0);
        }, 0);
        
        res.status(200).json({
            success: true,
            stats: {
                viewCount,
                purchaseCount,
                stayCount,
                totalDuration
            }
        });
    } catch (error) {
        console.error('获取销售人员产品活动统计失败:', error);
        res.status(500).json({
            success: false,
            message: '获取活动统计失败',
            error: error.message
        });
    }
};
const db = require('../models');
const User = db.User;
const UserActivityLog = db.UserActivityLog;
const Product = db.Product;

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
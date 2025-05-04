const db = require('../models');
const AdminActionLog = db.AdminActionLog;
const User = db.User;
const { Op } = db.Sequelize;

// 记录管理员操作
exports.logAdminAction = async (req, res, next) => {
    try {
        if (!req.user || !['admin', 'sales'].includes(req.user.role)) {
            return next();
        }
        
        const log = {
            accountId: req.user.id,
            role: req.user.role,
            action: req.method === 'GET' ? `查看${req.originalUrl}` : req.body.action || `操作${req.originalUrl}`,
            path: req.originalUrl,
            method: req.method,
            ipAddress: req.ip || req.connection.remoteAddress
        };
        
        await AdminActionLog.create(log);
        next();
    } catch (error) {
        console.error('记录管理员操作失败:', error);
        next(); // 即使日志记录失败，也继续执行请求
    }
};

// 获取管理员操作日志
exports.getAdminLogs = async (req, res) => {
    try {
        const { startDate, endDate, accountId, role, action, page = 1, limit = 20 } = req.query;
        
        const whereCondition = {};
        
        // 按日期筛选
        if (startDate && endDate) {
            whereCondition.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        } else if (startDate) {
            whereCondition.createdAt = {
                [Op.gte]: new Date(startDate)
            };
        } else if (endDate) {
            whereCondition.createdAt = {
                [Op.lte]: new Date(endDate)
            };
        }
        
        // 按账号ID筛选
        if (accountId) {
            whereCondition.accountId = accountId;
        }
        
        // 按角色筛选
        if (role && ['admin', 'sales'].includes(role)) {
            whereCondition.role = role;
        }
        
        // 按操作筛选
        if (action) {
            whereCondition.action = {
                [Op.like]: `%${action}%`
            };
        }
        
        const offset = (page - 1) * limit;
        
        // 查询总数
        const total = await AdminActionLog.count({ where: whereCondition });
        
        // 查询日志并关联用户信息
        const logs = await AdminActionLog.findAll({
            where: whereCondition,
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: offset,
            include: [{
                model: User,
                attributes: ['username', 'email'],
                as: 'admin',
                required: false
            }]
        });
        
        res.status(200).json({
            success: true,
            total,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil(total / limit),
            logs
        });
    } catch (error) {
        console.error('获取管理员日志失败:', error);
        res.status(500).json({
            success: false,
            message: '获取管理员日志时出错',
            error: error.message
        });
    }
};

// 清除旧日志
exports.cleanupLogs = async (req, res) => {
    try {
        const { days } = req.body;
        
        if (!days || isNaN(days) || days < 30) {
            return res.status(400).json({
                success: false,
                message: '清理日志时间必须大于等于30天'
            });
        }
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        
        const result = await AdminActionLog.destroy({
            where: {
                createdAt: {
                    [Op.lt]: cutoffDate
                }
            }
        });
        
        res.status(200).json({
            success: true,
            message: `成功清理了${result}条日志记录`,
            count: result
        });
    } catch (error) {
        console.error('清理日志失败:', error);
        res.status(500).json({
            success: false,
            message: '清理日志时出错',
            error: error.message
        });
    }
};

// 获取操作统计
exports.getActionStats = async (req, res) => {
    try {
        // 按角色统计操作数量
        const roleStats = await AdminActionLog.findAll({
            attributes: [
                'role',
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
            ],
            group: ['role']
        });
        
        // 按方法统计操作数量
        const methodStats = await AdminActionLog.findAll({
            attributes: [
                'method',
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
            ],
            group: ['method']
        });
        
        // 获取近7天的活动趋势
        const last7Days = new Date();
        last7Days.setDate(last7Days.getDate() - 7);
        
        const dailyStats = await AdminActionLog.findAll({
            attributes: [
                [db.sequelize.fn('DATE', db.sequelize.col('createdAt')), 'date'],
                [db.sequelize.fn('COUNT', db.sequelize.col('id')), 'count']
            ],
            where: {
                createdAt: {
                    [Op.gte]: last7Days
                }
            },
            group: [db.sequelize.fn('DATE', db.sequelize.col('createdAt'))]
        });
        
        res.status(200).json({
            success: true,
            stats: {
                byRole: roleStats,
                byMethod: methodStats,
                dailyTrend: dailyStats
            }
        });
    } catch (error) {
        console.error('获取操作统计失败:', error);
        res.status(500).json({
            success: false,
            message: '获取操作统计时出错',
            error: error.message
        });
    }
};

// 更新AdminActionLog模型的关联
exports.updateAssociation = async () => {
    try {
        // 在这里添加与User模型的关联
        const AdminActionLog = db.AdminActionLog;
        AdminActionLog.belongsTo(db.User, {
            foreignKey: 'accountId',
            as: 'admin'
        });
        
        console.log('管理员日志关联已更新');
    } catch (error) {
        console.error('更新管理员日志关联失败:', error);
    }
};
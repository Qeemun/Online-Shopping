const CustomerLog = require('../models/customerLog');
const User = require('../models/user');
const Product = require('../models/product');

// 记录客户浏览商品
exports.logProductView = async (customerId, productId) => {
    try {
        await CustomerLog.create({
            action: '浏览',
            customerId,
            productId
        });
    } catch (error) {
        console.error('记录浏览日志时出错:', error);
    }
};

// 记录客户购买商品
exports.logProductPurchase = async (customerId, productId) => {
    try {
        await CustomerLog.create({
            action: '购买',
            customerId,
            productId
        });
    } catch (error) {
        console.error('记录购买日志时出错:', error);
    }
};

// 获取客户的所有日志记录
exports.getCustomerLogs = async (customerId) => {
    try {
        const logs = await CustomerLog.findAll({
            where: { customerId },
            include: [
                { model: User, attributes: ['id', 'username', 'email'] },
                { model: Product, attributes: ['id', 'name', 'price'] }
            ]
        });
        return logs;
    } catch (error) {
        console.error('获取客户日志时出错:', error);
        return [];
    }
};

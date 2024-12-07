const Order = require('../models/order');
const OrderItem = require('../models/orderItem');
const Product = require('../models/product');

// 获取总销售额
exports.getTotalSales = async (startDate, endDate) => {
    try {
        const totalSales = await Order.sum('totalAmount', {
            where: {
                orderDate: {
                    [Op.between]: [startDate, endDate]
                },
                status: 'completed'  // 只计算已完成的订单
            }
        });
        return totalSales || 0;
    } catch (error) {
        console.error('获取总销售额时出错:', error);
        return 0;
    }
};

// 获取每个商品的销售情况
exports.getProductSales = async (startDate, endDate) => {
    try {
        const productSales = await OrderItem.findAll({
            attributes: [
                'productId',
                [sequelize.fn('SUM', sequelize.col('quantity')), 'totalQuantity'],
                [sequelize.fn('SUM', sequelize.col('price')), 'totalAmount']
            ],
            where: {
                '$Order.orderDate$': {
                    [Op.between]: [startDate, endDate]
                },
                '$Order.status$': 'completed' // 只计算已完成的订单
            },
            include: [
                {
                    model: Order,
                    attributes: [],
                    required: true
                },
                {
                    model: Product,
                    attributes: ['name']
                }
            ],
            group: ['productId', 'Product.id']
        });
        return productSales;
    } catch (error) {
        console.error('获取商品销售情况时出错:', error);
        return [];
    }
};

// 按时间段统计销售额（例如按天、按月）
exports.getSalesByTimePeriod = async (startDate, endDate, period) => {
    try {
        const salesByPeriod = await Order.findAll({
            attributes: [
                [sequelize.fn(period, sequelize.col('orderDate')), 'period'],
                [sequelize.fn('SUM', sequelize.col('totalAmount')), 'totalSales']
            ],
            where: {
                orderDate: {
                    [Op.between]: [startDate, endDate]
                },
                status: 'completed'
            },
            group: [sequelize.fn(period, sequelize.col('orderDate'))],
            order: [[sequelize.fn(period, sequelize.col('orderDate')), 'ASC']]
        });
        return salesByPeriod;
    } catch (error) {
        console.error('按时间段统计销售额时出错:', error);
        return [];
    }
};

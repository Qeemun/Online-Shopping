const db = require('../models');
const Product = db.Product;
const Order = db.Order;
const OrderItem = db.OrderItem;
const User = db.User;
const SalesProductAssignment = db.sequelize.models.SalesProductAssignment;
const ActivityLog = db.ActivityLog;
const { Op, Sequelize } = db.Sequelize;

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

// 获取按类别的销售统计
exports.getSalesByCategory = async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let dateFilter = {};
        
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                }
            };
        } else if (startDate) {
            dateFilter = {
                createdAt: {
                    [Op.gte]: new Date(startDate)
                }
            };
        } else if (endDate) {
            dateFilter = {
                createdAt: {
                    [Op.lte]: new Date(endDate)
                }
            };
        }
        
        // 获取所有已完成订单的商品
        const orderItems = await OrderItem.findAll({
            where: dateFilter,
            include: [
                {
                    model: Order,
                    as: 'order',
                    where: { status: 'completed' },
                    attributes: []
                },
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'category']
                }
            ]
        });
        
        // 按类别分组统计
        const categorySales = {};
        orderItems.forEach(item => {
            const category = item.product?.category || '未分类';
            if (!categorySales[category]) {
                categorySales[category] = {
                    quantity: 0,
                    revenue: 0,
                    orderCount: new Set()
                };
            }
            categorySales[category].quantity += item.quantity;
            categorySales[category].revenue += parseFloat(item.price) * item.quantity;
            categorySales[category].orderCount.add(item.orderId);
        });
        
        // 格式化结果
        const result = Object.keys(categorySales).map(category => ({
            category,
            quantity: categorySales[category].quantity,
            revenue: categorySales[category].revenue,
            orderCount: categorySales[category].orderCount.size
        }));
        
        res.status(200).json({
            success: true,
            categorySales: result
        });
    } catch (error) {
        console.error('获取类别销售统计失败:', error);
        res.status(500).json({
            success: false,
            message: '获取类别销售统计失败',
            error: error.message
        });
    }
};

// 获取库存状态报告
exports.getInventoryStatusReport = async (req, res) => {
    try {
        // 获取所有产品的库存状态
        const products = await Product.findAll({
            attributes: ['id', 'name', 'category', 'price', 'stock']
        });
        
        // 分类库存状态
        const stockStatus = {
            outOfStock: [],
            lowStock: [],
            normal: [],
            excess: []
        };
        
        products.forEach(product => {
            const { id, name, category, price, stock } = product;
            const item = { id, name, category, price, stock };
            
            if (stock <= 0) {
                stockStatus.outOfStock.push(item);
            } else if (stock < 5) {
                stockStatus.lowStock.push(item);
            } else if (stock < 50) {
                stockStatus.normal.push(item);
            } else {
                stockStatus.excess.push(item);
            }
        });
        
        res.status(200).json({
            success: true,
            stockStatus
        });
    } catch (error) {
        console.error('获取库存状态报告失败:', error);
        res.status(500).json({
            success: false,
            message: '获取库存状态报告失败',
            error: error.message
        });
    }
};

// 获取销售人员负责商品的销售业绩
exports.getStaffProductPerformance = async (req, res) => {
    try {
        const { staffId } = req.params;
        const { startDate, endDate } = req.query;
        
        // 验证销售人员是否存在
        const salesStaff = await User.findOne({
            where: { 
                id: staffId,
                role: 'sales'
            }
        });
        
        if (!salesStaff) {
            return res.status(404).json({
                success: false,
                message: '销售人员不存在'
            });
        }
        
        // 获取分配给该销售人员的所有产品
        const assignments = await SalesProductAssignment.findAll({
            where: { salesId: staffId }
        });
        
        const productIds = assignments.map(assignment => assignment.productId);
        
        if (productIds.length === 0) {
            return res.status(200).json({
                success: true,
                staff: {
                    id: salesStaff.id,
                    name: salesStaff.username
                },
                productSales: []
            });
        }
        
        // 设置日期过滤条件
        let dateFilter = {};
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                }
            };
        } else if (startDate) {
            dateFilter = {
                createdAt: {
                    [Op.gte]: new Date(startDate)
                }
            };
        } else if (endDate) {
            dateFilter = {
                createdAt: {
                    [Op.lte]: new Date(endDate)
                }
            };
        }
        
        // 获取这些产品的销售数据
        const orderItems = await OrderItem.findAll({
            where: {
                productId: { [Op.in]: productIds },
                ...dateFilter
            },
            include: [
                {
                    model: Order,
                    as: 'order',
                    where: { status: 'completed' },
                    attributes: []
                },
                {
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'category']
                }
            ]
        });
        
        // 按产品分组统计
        const productSales = {};
        orderItems.forEach(item => {
            const productId = item.productId;
            if (!productSales[productId]) {
                productSales[productId] = {
                    id: productId,
                    name: item.product?.name || '未知商品',
                    category: item.product?.category || '未分类',
                    quantity: 0,
                    revenue: 0
                };
            }
            productSales[productId].quantity += item.quantity;
            productSales[productId].revenue += parseFloat(item.price) * item.quantity;
        });
        
        res.status(200).json({
            success: true,
            staff: {
                id: salesStaff.id,
                name: salesStaff.username
            },
            productSales: Object.values(productSales)
        });
    } catch (error) {
        console.error('获取销售人员产品业绩失败:', error);
        res.status(500).json({
            success: false,
            message: '获取销售人员产品业绩失败',
            error: error.message
        });
    }
};

// 获取时间段的销售趋势
exports.getSalesTrend = async (req, res) => {
    try {
        const { period = 'day', startDate, endDate } = req.query;
        let dateFilter = {};
        
        if (startDate && endDate) {
            dateFilter = {
                createdAt: {
                    [Op.between]: [new Date(startDate), new Date(endDate)]
                }
            };
        } else if (startDate) {
            dateFilter = {
                createdAt: {
                    [Op.gte]: new Date(startDate)
                }
            };
        } else if (endDate) {
            dateFilter = {
                createdAt: {
                    [Op.lte]: new Date(endDate)
                }
            };
        } else {
            // 默认显示最近30天
            const last30Days = new Date();
            last30Days.setDate(last30Days.getDate() - 30);
            dateFilter = {
                createdAt: {
                    [Op.gte]: last30Days
                }
            };
        }
        
        // 确定日期分组格式
        let dateFormat;
        switch(period.toLowerCase()) {
            case 'month':
                dateFormat = '%Y-%m';
                break;
            case 'year':
                dateFormat = '%Y';
                break;
            case 'week':
                dateFormat = '%Y-%u'; // ISO周编号
                break;
            case 'day':
            default:
                dateFormat = '%Y-%m-%d';
        }
        
        // 获取订单的销售趋势
        const salesByPeriod = await Order.findAll({
            attributes: [
                [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), dateFormat), 'period'],
                [Sequelize.fn('COUNT', Sequelize.col('id')), 'orderCount'],
                [Sequelize.fn('SUM', Sequelize.col('totalAmount')), 'revenue']
            ],
            where: {
                ...dateFilter,
                status: 'completed'
            },
            group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), dateFormat)],
            order: [[Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), dateFormat), 'ASC']]
        });
        
        res.status(200).json({
            success: true,
            period,
            salesTrend: salesByPeriod.map(item => ({
                period: item.dataValues.period,
                orderCount: parseInt(item.dataValues.orderCount, 10),
                revenue: parseFloat(item.dataValues.revenue || 0)
            }))
        });
    } catch (error) {
        console.error('获取销售趋势失败:', error);
        res.status(500).json({
            success: false,
            message: '获取销售趋势失败',
            error: error.message
        });
    }
};

// 获取销售趋势数据
exports.getSalesTrend = async (req, res) => {
    try {
        // 从查询参数获取日期范围
        const { startDate, endDate, category } = req.query;
        
        // 验证权限
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '无权访问此资源'
            });
        }
        
        // 构建日期过滤条件
        const dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        } else if (startDate) {
            dateFilter.createdAt = {
                [Op.gte]: new Date(startDate)
            };
        } else if (endDate) {
            dateFilter.createdAt = {
                [Op.lte]: new Date(endDate)
            };
        }
        
        // 构建分组条件（按天统计）
        const groupBy = [Sequelize.fn('DATE', Sequelize.col('Order.createdAt'))];
        
        // 构建商品类别过滤条件
        let productFilter = {};
        if (category) {
            productFilter = {
                category
            };
        }
        
        // 获取所有已完成订单项
        const orderItems = await OrderItem.findAll({
            include: [
                {
                    model: Order,
                    as: 'order',
                    where: {
                        status: 'completed',
                        ...dateFilter
                    }
                },
                {
                    model: Product,
                    as: 'product',
                    where: productFilter,
                    required: category ? true : false
                }
            ]
        });
        
        // 按日期分组统计
        const salesByDate = {};
        
        orderItems.forEach(item => {
            const date = item.order.createdAt.toISOString().split('T')[0];
            
            if (!salesByDate[date]) {
                salesByDate[date] = {
                    period: date,
                    revenue: 0,
                    orderCount: 0,
                    quantity: 0
                };
            }
            
            // 累加销售额和数量
            salesByDate[date].revenue += parseFloat(item.price) * item.quantity;
            salesByDate[date].quantity += item.quantity;
            
            // 跟踪唯一订单ID
            if (!salesByDate[date].orderIds) {
                salesByDate[date].orderIds = new Set();
            }
            salesByDate[date].orderIds.add(item.orderId);
        });
        
        // 转换为数组并计算订单数
        const salesTrend = Object.values(salesByDate).map(day => {
            const { orderIds, ...rest } = day;
            return {
                ...rest,
                orderCount: orderIds ? orderIds.size : 0
            };
        });
        
        // 按日期排序
        salesTrend.sort((a, b) => new Date(a.period) - new Date(b.period));
        
        res.status(200).json({
            success: true,
            salesTrend
        });
    } catch (error) {
        console.error('获取销售趋势失败:', error);
        res.status(500).json({
            success: false,
            message: '获取销售趋势失败',
            error: error.message
        });
    }
};

// 获取类别销售数据
exports.getCategorySales = async (req, res) => {
    try {
        // 从查询参数获取日期范围
        const { startDate, endDate } = req.query;
        
        // 验证权限
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '无权访问此资源'
            });
        }
        
        // 构建日期过滤条件
        const dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        } else if (startDate) {
            dateFilter.createdAt = {
                [Op.gte]: new Date(startDate)
            };
        } else if (endDate) {
            dateFilter.createdAt = {
                [Op.lte]: new Date(endDate)
            };
        }
        
        // 获取所有已完成订单项
        const orderItems = await OrderItem.findAll({
            include: [
                {
                    model: Order,
                    as: 'order',
                    where: {
                        status: 'completed',
                        ...dateFilter
                    }
                },
                {
                    model: Product,
                    as: 'product'
                }
            ]
        });
        
        // 按商品类别分组统计
        const salesByCategory = {};
        
        orderItems.forEach(item => {
            if (!item.product) return;
            
            const category = item.product.category || '未分类';
            
            if (!salesByCategory[category]) {
                salesByCategory[category] = {
                    category,
                    revenue: 0,
                    quantity: 0
                };
            }
            
            // 累加销售额和数量
            salesByCategory[category].revenue += parseFloat(item.price) * item.quantity;
            salesByCategory[category].quantity += item.quantity;
            
            // 跟踪唯一订单ID
            if (!salesByCategory[category].orderIds) {
                salesByCategory[category].orderIds = new Set();
            }
            salesByCategory[category].orderIds.add(item.orderId);
        });
        
        // 转换为数组并计算订单数
        const categorySales = Object.values(salesByCategory).map(category => {
            const { orderIds, ...rest } = category;
            return {
                ...rest,
                orderCount: orderIds ? orderIds.size : 0
            };
        });
        
        // 计算前一期的销售额，用于环比增长计算
        if (startDate && endDate) {
            const startDateObj = new Date(startDate);
            const endDateObj = new Date(endDate);
            const dateDiff = endDateObj - startDateObj;
            
            // 计算前一期的日期范围
            const prevStartDate = new Date(startDateObj.getTime() - dateDiff);
            const prevEndDate = new Date(startDateObj.getTime() - 1);
            
            // 获取前一期的订单项
            const prevOrderItems = await OrderItem.findAll({
                include: [
                    {
                        model: Order,
                        as: 'order',
                        where: {
                            status: 'completed',
                            createdAt: {
                                [Op.between]: [prevStartDate, prevEndDate]
                            }
                        }
                    },
                    {
                        model: Product,
                        as: 'product'
                    }
                ]
            });
            
            // 按商品类别统计前一期的销售额
            const prevSalesByCategory = {};
            
            prevOrderItems.forEach(item => {
                if (!item.product) return;
                
                const category = item.product.category || '未分类';
                
                if (!prevSalesByCategory[category]) {
                    prevSalesByCategory[category] = {
                        revenue: 0
                    };
                }
                
                // 累加销售额
                prevSalesByCategory[category].revenue += parseFloat(item.price) * item.quantity;
            });
            
            // 添加前一期的销售额到当前数据
            categorySales.forEach(category => {
                const prevSales = prevSalesByCategory[category.category];
                category.previousRevenue = prevSales ? prevSales.revenue : 0;
            });
        }
        
        // 获取类别的页面浏览数据（用于计算转化率）
        const viewCounts = await ActivityLog.findAll({
            attributes: [
                [Sequelize.col('product.category'), 'category'],
                [Sequelize.fn('COUNT', Sequelize.col('ActivityLog.id')), 'count']
            ],
            where: {
                action: 'view',
                ...dateFilter
            },
            include: [{
                model: Product,
                as: 'product',
                attributes: []
            }],
            group: [Sequelize.col('product.category')]
        });
        
        // 添加浏览次数到类别销售数据
        const viewCountMap = {};
        viewCounts.forEach(vc => {
            if (vc.dataValues && vc.dataValues.category) {
                viewCountMap[vc.dataValues.category] = vc.dataValues.count;
            }
        });
        
        categorySales.forEach(category => {
            category.viewCount = viewCountMap[category.category] || 0;
        });
        
        // 按销售额排序
        categorySales.sort((a, b) => b.revenue - a.revenue);
        
        res.status(200).json({
            success: true,
            categorySales
        });
    } catch (error) {
        console.error('获取类别销售数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取类别销售数据失败',
            error: error.message
        });
    }
};

// 获取库存状态数据
exports.getInventoryStatus = async (req, res) => {
    try {
        // 验证权限
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '无权访问此资源'
            });
        }
        
        // 获取所有产品
        const products = await Product.findAll();
        
        // 按库存状态分组
        const stockStatus = {
            outOfStock: [],
            lowStock: [],
            normal: [],
            excess: []
        };
        
        products.forEach(product => {
            if (product.stock <= 0) {
                stockStatus.outOfStock.push(product);
            } else if (product.stock < 5) {
                stockStatus.lowStock.push(product);
            } else if (product.stock <= 50) {
                stockStatus.normal.push(product);
            } else {
                stockStatus.excess.push(product);
            }
        });
        
        res.status(200).json({
            success: true,
            stockStatus
        });
    } catch (error) {
        console.error('获取库存状态失败:', error);
        res.status(500).json({
            success: false,
            message: '获取库存状态失败',
            error: error.message
        });
    }
};

// 获取畅销商品数据
exports.getTopProducts = async (req, res) => {
    try {
        // 从查询参数获取日期范围和类别
        const { startDate, endDate, category, limit = 10 } = req.query;
        
        // 验证权限
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '无权访问此资源'
            });
        }
        
        // 构建日期过滤条件
        const dateFilter = {};
        if (startDate && endDate) {
            dateFilter.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        } else if (startDate) {
            dateFilter.createdAt = {
                [Op.gte]: new Date(startDate)
            };
        } else if (endDate) {
            dateFilter.createdAt = {
                [Op.lte]: new Date(endDate)
            };
        }
        
        // 构建商品类别过滤条件
        let productFilter = {};
        if (category) {
            productFilter = {
                category
            };
        }
        
        // 获取所有已完成订单项
        const orderItems = await OrderItem.findAll({
            include: [
                {
                    model: Order,
                    as: 'order',
                    where: {
                        status: 'completed',
                        ...dateFilter
                    }
                },
                {
                    model: Product,
                    as: 'product',
                    where: productFilter,
                    required: category ? true : false
                }
            ]
        });
        
        // 按商品ID分组统计
        const salesByProduct = {};
        
        orderItems.forEach(item => {
            if (!item.product) return;
            
            const productId = item.product.id;
            
            if (!salesByProduct[productId]) {
                salesByProduct[productId] = {
                    id: productId,
                    name: item.product.name,
                    category: item.product.category,
                    revenue: 0,
                    soldQuantity: 0,
                    stock: item.product.stock,
                    price: item.product.price
                };
            }
            
            // 累加销售额和数量
            salesByProduct[productId].revenue += parseFloat(item.price) * item.quantity;
            salesByProduct[productId].soldQuantity += item.quantity;
        });
        
        // 转换为数组
        let products = Object.values(salesByProduct);
        
        // 按销售额排序
        products.sort((a, b) => b.revenue - a.revenue);
        
        // 限制返回数量
        products = products.slice(0, parseInt(limit));
        
        // 获取每个产品的负责销售人员
        const SalesProductAssignment = db.sequelize.models.SalesProductAssignment;
        for (const product of products) {
            const assignment = await SalesProductAssignment.findOne({
                where: { productId: product.id },
                include: [{
                    model: User,
                    as: 'salesStaff',
                    attributes: ['id', 'username', 'email']
                }]
            });
            
            product.salesStaff = assignment ? assignment.salesStaff : null;
        }
        
        res.status(200).json({
            success: true,
            products
        });
    } catch (error) {
        console.error('获取畅销商品失败:', error);
        res.status(500).json({
            success: false,
            message: '获取畅销商品失败',
            error: error.message
        });
    }
};

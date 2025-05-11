const db = require('../models');
const Product = db.Product;
const Order = db.Order;
const OrderItem = db.OrderItem;
const User = db.User;
const SalesProductAssignment = db.sequelize.models.SalesProductAssignment;
// 使用ProductViewLog代替ActivityLog进行商品浏览查询
const ProductViewLog = db.sequelize.models.ProductViewLog || db.sequelize.define('ProductViewLog', {}, {});
const { Op, Sequelize } = db.Sequelize;
const sequelize = db.sequelize;

// 获取总销售额
exports.getTotalSales = async (startDate, endDate) => {    try {
        const totalSales = await Order.sum('totalAmount', {
            where: {
                createdAt: {
                    [Op.between]: [startDate, endDate]
                },
                status: {
                    [Op.in]: ['completed', 'paid', 'shipped'] // 包含已完成、已支付和已发货的订单
                }
            }
        });
        return totalSales || 0;
    } catch (error) {
        console.error('获取总销售额时出错:', error);
        return 0;
    }
};

// 获取总订单数
exports.getTotalOrders = async (startDate, endDate) => {    try {
        const totalOrders = await Order.count({
            where: {
                createdAt: {
                    [Op.between]: [startDate, endDate]
                },
                status: {
                    [Op.in]: ['completed', 'paid', 'shipped'] // 包含已完成、已支付和已发货的订单
                }
            }
        });
        return totalOrders || 0;
    } catch (error) {
        console.error('获取总订单数时出错:', error);
        return 0;
    }
};

// 获取总销售数量
exports.getTotalQuantity = async (startDate, endDate) => {    try {
        // 使用子查询方式避免SQL_MODE=ONLY_FULL_GROUP_BY错误
        const result = await sequelize.query(`
            SELECT SUM(oi.quantity) as totalQuantity
            FROM orderItems as oi
            INNER JOIN orders as o ON oi.orderId = o.id
            WHERE o.createdAt BETWEEN :startDate AND :endDate
            AND o.status IN ('completed', 'paid', 'shipped')
        `, {
            replacements: { startDate, endDate },
            type: sequelize.QueryTypes.SELECT
        });
        
        return (result && result[0] && result[0].totalQuantity) || 0;
    } catch (error) {
        console.error('获取总销售数量时出错:', error);
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
            ],            where: {
                '$Order.createdAt$': {
                    [Op.between]: [startDate, endDate]
                },
                '$Order.status$': {
                    [Op.in]: ['completed', 'paid', 'shipped'] // 包含已完成、已支付和已发货的订单
                }
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
            ],            where: {
                createdAt: {
                    [Op.between]: [startDate, endDate]                },
                status: {
                    [Op.in]: ['completed', 'paid', 'shipped'] // 包含已完成、已支付和已发货的订单
                }
            },
            group: [sequelize.fn(period, sequelize.col('createdAt'))],
            order: [[sequelize.fn(period, sequelize.col('createdAt')), 'ASC']]
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
                    where: { 
                        status: {
                            [Op.in]: ['completed', 'paid', 'shipped'] // 包含已完成、已支付和已发货的订单
                        } 
                    },
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
                {                    model: Order,
                    as: 'order',
                    where: { 
                        status: {
                            [Op.in]: ['completed', 'paid', 'shipped'] // 包含已完成、已支付和已发货的订单
                        }
                    },
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
exports.getSalesTrend = async (req, res, isInternal = false) => {
    try {
        // 处理直接调用和API请求两种情况
        let period = 'day';
        let startDate, endDate;
        
        if (isInternal && req) {
            // 内部调用时，req可能是一个包含query的对象
            period = req.query?.period || 'day';
            startDate = req.query?.startDate;
            endDate = req.query?.endDate;
        } else if (req && req.query) {
            // 正常的API请求
            period = req.query.period || 'day';
            startDate = req.query.startDate;
            endDate = req.query.endDate;
        }
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
        switch(period?.toLowerCase()) {
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
            ],            where: {
                ...dateFilter,
                status: {
                    [Op.in]: ['completed', 'paid', 'shipped'] // 包含已完成、已支付和已发货的订单
                }
            },
            group: [Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), dateFormat)],
            order: [[Sequelize.fn('DATE_FORMAT', Sequelize.col('createdAt'), dateFormat), 'ASC']]
        });
        
        const salesTrend = salesByPeriod.map(item => ({
            period: item.dataValues.period,
            orderCount: parseInt(item.dataValues.orderCount, 10),
            revenue: parseFloat(item.dataValues.revenue || 0)
        }));
        
        // 如果是内部调用，直接返回数据
        if (isInternal) {
            return salesTrend;
        }
        
        // 否则作为API响应
        res.status(200).json({
            success: true,
            period,
            salesTrend
        });
    } catch (error) {
        console.error('获取销售趋势失败:', error);
        if (isInternal) {
            return [];
        }
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
        // 检查用户是否有权限
        // if (req.user.role !== 'admin' && req.user.role !== 'sales') {
        //     return res.status(403).json({
        //         success: false,
        //         message: '无权访问此资源'
        //     });
        // }
          // 从查询参数获取日期范围
        const { startDate, endDate } = req.query;
        
        // 构建日期过滤条件
        const dateFilter = {};
        let validStartDate = startDate;
        let validEndDate = endDate;
        
        // 如果没有提供日期，使用默认的日期范围（过去30天）
        if (!startDate && !endDate) {
            const now = new Date();
            validEndDate = now.toISOString().split('T')[0]; // 今天
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
            validStartDate = thirtyDaysAgo.toISOString().split('T')[0]; // 30天前
            
            console.log(`使用默认日期范围: ${validStartDate} 到 ${validEndDate}`);
        }
        
        // 构建日期过滤条件
        if (validStartDate && validEndDate) {
            // 确保结束日期包含当天的最后时刻
            const endDateWithTime = new Date(validEndDate);
            endDateWithTime.setHours(23, 59, 59, 999);
            
            dateFilter.createdAt = {
                [Op.between]: [new Date(validStartDate), endDateWithTime]
            };
        } else if (validStartDate) {
            dateFilter.createdAt = {
                [Op.gte]: new Date(validStartDate)
            };
        } else if (validEndDate) {
            const endDateWithTime = new Date(validEndDate);
            endDateWithTime.setHours(23, 59, 59, 999);
            
            dateFilter.createdAt = {
                [Op.lte]: endDateWithTime
            };
        }
        
        // 获取所有已完成订单项
        const orderItems = await OrderItem.findAll({
            include: [
                {
                    model: Order,
                    as: 'order',
                    where: {
                        status: {
                            [Op.in]: ['completed', 'paid', 'shipped'] // 包含已完成、已支付和已发货的订单
                        },
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
                    quantity: 0,
                    orderIds: new Set() // 初始化orderIds为空集合
                };
            }
            
            // 安全地解析价格
            const price = item.price ? parseFloat(item.price) : 0;
            const quantity = item.quantity || 0;
            
            // 累加销售额和数量
            salesByCategory[category].revenue += price * quantity;
            salesByCategory[category].quantity += quantity;
            
            // 跟踪唯一订单ID
            if (item.orderId) {
                salesByCategory[category].orderIds.add(item.orderId);
            }
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
                        as: 'order',                        where: {
                            status: {
                                [Op.in]: ['completed', 'paid', 'shipped'] // 包含已完成、已支付和已发货的订单
                            },
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
                
                // 安全地解析价格和数量
                const price = item.price ? parseFloat(item.price) : 0;
                const quantity = item.quantity || 0;
                
                // 累加销售额
                prevSalesByCategory[category].revenue += price * quantity;
            });
              // 添加前一期的销售额到当前数据
            categorySales.forEach(category => {
                const prevSales = prevSalesByCategory[category.category];
                const previousRevenue = prevSales ? prevSales.revenue : 0;
                category.previousRevenue = previousRevenue;
                
                // 计算增长率
                if (previousRevenue > 0) {
                    category.growthRate = ((category.revenue - previousRevenue) / previousRevenue) * 100;
                } else if (category.revenue > 0) {
                    category.growthRate = 100; // 前期为0，当前期有销售，增长率为100%
                } else {
                    category.growthRate = 0; // 两期都为0，增长率为0
                }
            });
        }        // 获取类别的页面浏览数据（用于计算转化率）
        // 创建正确的日期过滤条件，明确指定字段名
        const viewDateFilter = {};
        if (startDate && endDate) {
            viewDateFilter.createdAt = {
                [Op.between]: [new Date(startDate), new Date(endDate)]
            };
        } else if (startDate) {
            viewDateFilter.createdAt = {
                [Op.gte]: new Date(startDate)
            };
        } else if (endDate) {
            viewDateFilter.createdAt = {
                [Op.lte]: new Date(endDate)
            };
        }
        
        // 使用try/catch块处理可能的查询错误
        let viewCounts = [];
        try {
            console.log('准备查询ProductViewLog表获取商品浏览数据');
            
            // 使用原始SQL查询，这样可以避免模型关联问题
            const query = `
                SELECT p.category as category, COUNT(pvl.id) as count
                FROM ProductViewLogs pvl
                INNER JOIN products p ON pvl.productId = p.id
                WHERE pvl.createdAt BETWEEN ? AND ?
                GROUP BY p.category
            `;
            
            const startDateObj = viewDateFilter.createdAt[Op.gte] || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 默认30天前
            const endDateObj = viewDateFilter.createdAt[Op.lte] || new Date(); // 默认现在
            
            viewCounts = await sequelize.query(query, {
                replacements: [startDateObj, endDateObj],
                type: sequelize.QueryTypes.SELECT,
                logging: console.log // 输出生成的SQL查询，便于调试
            });
            
            console.log('成功获取到产品浏览数据:', viewCounts);
        } catch (viewError) {
            console.error('获取商品浏览数据失败:', viewError);
            // 在出错的情况下继续处理，使用空数组作为浏览数据
            
            // 如果是表结构问题，记录详细错误信息
            if (viewError.parent) {
                console.error('SQL错误详情:', viewError.parent.message);
            }
        }
          // 添加浏览次数到类别销售数据
        const viewCountMap = {};
        
        // 处理原始SQL查询结果，不需要使用dataValues
        viewCounts.forEach(vc => {
            if (vc && vc.category) {
                viewCountMap[vc.category] = parseInt(vc.count || 0);
            }
        });
        
        // 将浏览次数添加到类别销售数据中
        categorySales.forEach(category => {
            category.viewCount = viewCountMap[category.category] || 0;
            
            // 计算转化率 (订单数 / 浏览次数)
            if (category.viewCount > 0) {
                category.conversionRate = ((category.orderCount / category.viewCount) * 100).toFixed(2);
            } else {
                category.conversionRate = 0;
            }
        });
        
        // 按销售额排序
        categorySales.sort((a, b) => b.revenue - a.revenue);
        
        res.status(200).json({
            success: true,
            categorySales
        });    } catch (error) {
        console.error('获取类别销售数据失败:', error);
        // 返回友好的错误消息
        res.status(500).json({
            success: false,
            message: '获取类别销售数据失败',
            error: error.message,
            hint: '请检查日期格式是否正确，并确保数据库中有相关订单数据'
        });
    }
};

// 获取库存状态数据
exports.getInventoryStatus = async (req, res) => {
    // 移除权限检查，允许授权用户查看库存状态
    // if (req.user.role !== 'admin') {
    //     return res.status(403).json({
    //         success: false,
    //         message: '无权访问此资源'
    //     });
    // }
    try {
        
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
        // 移除权限检查，允许授权用户查看畅销商品
        // if (req.user.role !== 'admin' && req.user.role !== 'sales') {
        //     return res.status(403).json({
        //         success: false,
        //         message: '无权访问此资源'
        //     });
        // }
        
        // 从查询参数获取日期范围和类别
        const { startDate, endDate, category, limit = 10 } = req.query;
        
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
                {                    model: Order,
                    as: 'order',
                    where: {
                        status: {
                            [Op.in]: ['completed', 'paid', 'shipped'] // 包含已完成、已支付和已发货的订单
                        },
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
                salesByProduct[productId] = {                id: productId,
                    name: item.product.name,
                    category: item.product.category,
                    revenue: 0,
                    quantitySold: 0,
                    stock: item.product.stock,
                    price: item.product.price
                };
            }
              // 累加销售额和数量
            salesByProduct[productId].revenue += parseFloat(item.price) * item.quantity;
            salesByProduct[productId].quantitySold += item.quantity;
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
            topProducts: products
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

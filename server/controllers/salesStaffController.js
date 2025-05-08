const db = require('../models');
const User = db.User;
const Product = db.Product;
const Order = db.Order;
const OrderItem = db.OrderItem;
const SalesProductAssignment = db.SalesProductAssignment;
const bcrypt = require('bcryptjs');
const { Op } = db.Sequelize;

// 错误响应辅助函数
const errorResponse = (res, statusCode, message, error = null) => {
    console.error(`${message}:`, error);
    return res.status(statusCode).json({
        success: false,
        message,
        ...(error && { error: error.message })
    });
};

// 成功响应辅助函数
const successResponse = (res, statusCode, data, message = null) => {
    return res.status(statusCode).json({
        success: true,
        ...(message && { message }),
        ...data
    });
};

// 权限检查辅助函数
const checkAdminPermission = (req, res) => {
    if (req.user.role !== 'admin') {
        return { hasPermission: false, response: errorResponse(res, 403, '无权执行此操作') };
    }
    return { hasPermission: true };
};

// 验证销售人员是否存在辅助函数
const validateSalesStaff = async (salesId, res, includeOtherRoles = false) => {
    try {
        const whereClause = { id: salesId };
        
        if (includeOtherRoles) {
            whereClause.role = { [Op.in]: ['sales', 'seller', 'salesStaff'] };
        } else {
            whereClause.role = 'sales';
        }
        
        const salesStaff = await User.findOne({ where: whereClause });
        
        if (!salesStaff) {
            return { exists: false, response: errorResponse(res, 404, '未找到销售人员') };
        }
        
        return { exists: true, salesStaff };
    } catch (error) {
        return { exists: false, response: errorResponse(res, 500, '验证销售人员时出错', error) };
    }
};

// 计算销售金额辅助函数
const calculateRevenue = (orderItems) => {
    return orderItems.reduce((total, item) => {
        return total + (parseFloat(item.price) * item.quantity);
    }, 0);
};

// 初始化关联
exports.initializeAssociations = async () => {
    try {
        await SalesProductAssignment.sync();
        console.log('销售人员产品关联表已同步');
    } catch (error) {
        console.error('初始化销售人员产品关联表失败:', error);
    }
};

// 获取所有销售人员
exports.getAllSalesStaff = async (req, res) => {
    try {
        // 校验权限
        const permissionCheck = checkAdminPermission(req, res);
        if (!permissionCheck.hasPermission) return permissionCheck.response;
        
        const salesStaff = await User.findAll({
            where: { role: 'sales' },
            attributes: ['id', 'username', 'email', 'createdAt']
        });
        
        return successResponse(res, 200, { salesStaff });
    } catch (error) {
        return errorResponse(res, 500, '获取销售人员列表失败', error);
    }
};

// 获取单个销售人员信息
exports.getSalesStaffDetails = async (req, res) => {
    try {
        const { salesId } = req.params;
        
        // 校验权限
        if (req.user.role !== 'admin' && req.userId !== parseInt(salesId)) {
            return errorResponse(res, 403, '无权执行此操作');
        }
        
        // 验证销售人员是否存在
        const validation = await validateSalesStaff(salesId, res);
        if (!validation.exists) return validation.response;
        
        // 获取销售人员负责的商品数量
        const productCount = await SalesProductAssignment.count({
            where: { salesId }
        });
        
        return successResponse(res, 200, {
            salesStaff: {
                ...validation.salesStaff.toJSON(),
                productCount
            }
        });
    } catch (error) {
        return errorResponse(res, 500, '获取销售人员详情失败', error);
    }
};

// 添加销售人员
exports.addSalesStaff = async (req, res) => {
    try {
        // 校验权限
        const permissionCheck = checkAdminPermission(req, res);
        if (!permissionCheck.hasPermission) return permissionCheck.response;
        
        const { username, email, password } = req.body;
        
        // 验证必填字段
        if (!username || !email || !password) {
            return errorResponse(res, 400, '用户名、邮箱和密码为必填项');
        }
        
        // 检查邮箱是否已存在
        const existingUser = await User.findOne({
            where: { email }
        });
        
        if (existingUser) {
            return errorResponse(res, 400, '该邮箱已被使用');
        }
        
        // 创建销售人员账号
        const newSalesStaff = await User.create({
            username,
            email,
            password, // 密码会通过User模型的钩子自动加密
            role: 'sales'
        });
        
        return successResponse(res, 201, {
            salesStaff: {
                id: newSalesStaff.id,
                username: newSalesStaff.username,
                email: newSalesStaff.email,
                createdAt: newSalesStaff.createdAt
            }
        }, '销售人员添加成功');
    } catch (error) {
        return errorResponse(res, 500, '添加销售人员失败', error);
    }
};

// 更新销售人员信息
exports.updateSalesStaff = async (req, res) => {
    try {
        const { salesId } = req.params;
        
        // 校验权限
        if (req.user.role !== 'admin' && req.userId !== parseInt(salesId)) {
            return errorResponse(res, 403, '无权执行此操作');
        }
        
        // 验证销售人员是否存在
        const validation = await validateSalesStaff(salesId, res);
        if (!validation.exists) return validation.response;
        
        const salesStaff = validation.salesStaff;
        const { username, email } = req.body;
        const updates = {};
        
        if (username) updates.username = username;
        if (email) updates.email = email;
        
        // 如果是管理员，还可以更新其他字段
        if (req.user.role === 'admin') {
            if (req.body.active !== undefined) {
                updates.active = Boolean(req.body.active);
            }
        }
        
        await salesStaff.update(updates);
        
        return successResponse(res, 200, {
            salesStaff: {
                id: salesStaff.id,
                username: salesStaff.username,
                email: salesStaff.email,
                active: salesStaff.active,
                createdAt: salesStaff.createdAt
            }
        }, '销售人员信息更新成功');
    } catch (error) {
        return errorResponse(res, 500, '更新销售人员信息失败', error);
    }
};

// 删除销售人员
exports.deleteSalesStaff = async (req, res) => {
    try {
        const { salesId } = req.params;
        
        // 校验权限
        const permissionCheck = checkAdminPermission(req, res);
        if (!permissionCheck.hasPermission) return permissionCheck.response;
        
        // 验证销售人员是否存在
        const validation = await validateSalesStaff(salesId, res);
        if (!validation.exists) return validation.response;
        
        // 删除销售人员与产品的所有关联
        await SalesProductAssignment.destroy({
            where: { salesId }
        });
        
        // 删除销售人员账号
        await validation.salesStaff.destroy();
        
        return successResponse(res, 200, {}, '销售人员删除成功');
    } catch (error) {
        return errorResponse(res, 500, '删除销售人员失败', error);
    }
};

// 重置销售人员密码
exports.resetSalesStaffPassword = async (req, res) => {
    try {
        const { salesId } = req.params;
        
        // 校验权限
        const permissionCheck = checkAdminPermission(req, res);
        if (!permissionCheck.hasPermission) return permissionCheck.response;
        
        // 验证销售人员是否存在
        const validation = await validateSalesStaff(salesId, res);
        if (!validation.exists) return validation.response;
        
        const { newPassword } = req.body;
        
        if (!newPassword) {
            return errorResponse(res, 400, '新密码不能为空');
        }
        
        // 更新密码
        await validation.salesStaff.update({ password: newPassword });
        
        return successResponse(res, 200, {}, '密码重置成功');
    } catch (error) {
        return errorResponse(res, 500, '重置密码失败', error);
    }
};

// 获取销售人员负责的产品ID列表
const getSalesStaffProductIds = async (salesId) => {
    const assignments = await SalesProductAssignment.findAll({
        where: { salesId }
    });
    
    return assignments.map(assignment => assignment.productId);
};

// 获取销售人员负责的商品
exports.getSalesStaffProducts = async (req, res) => {
    try {
        const { salesId } = req.params;
        
        // 校验权限
        if (req.user.role !== 'admin' && req.userId !== parseInt(salesId)) {
            return errorResponse(res, 403, '无权执行此操作');
        }
        
        // 验证销售人员是否存在
        const validation = await validateSalesStaff(salesId, res);
        if (!validation.exists) return validation.response;
        
        // 获取销售人员负责的商品ID
        const productIds = await getSalesStaffProductIds(salesId);
        
        if (productIds.length === 0) {
            return successResponse(res, 200, { products: [] });
        }
        
        // 获取产品详情
        const products = await Product.findAll({
            where: { id: productIds }
        });
        
        // 获取每件产品的销售统计
        const productsWithStats = await Promise.all(products.map(async (product) => {
            // 查询该产品的销售订单数量
            const soldItems = await OrderItem.findAll({
                where: { productId: product.id },
                include: [{
                    model: Order,
                    as: 'order',
                    where: { status: 'completed' }
                }]
            });
            
            // 计算销售总量
            const totalSold = soldItems.reduce((total, item) => total + item.quantity, 0);
            
            return {
                ...product.toJSON(),
                sold: totalSold
            };
        }));
        
        return successResponse(res, 200, { products: productsWithStats });
    } catch (error) {
        return errorResponse(res, 500, '获取销售人员商品失败', error);
    }
};

// 分配商品给销售人员
exports.assignProductToSalesStaff = async (req, res) => {
    try {
        const { salesId } = req.params;
        
        // 校验权限
        const permissionCheck = checkAdminPermission(req, res);
        if (!permissionCheck.hasPermission) return permissionCheck.response;
        
        // 验证销售人员是否存在
        const validation = await validateSalesStaff(salesId, res);
        if (!validation.exists) return validation.response;
        
        // 获取要分配的商品ID
        const { productId } = req.body;
        
        if (!productId) {
            return errorResponse(res, 400, '商品ID不能为空');
        }
        
        // 验证商品是否存在
        const product = await Product.findByPk(productId);
        
        if (!product) {
            return errorResponse(res, 404, '未找到商品');
        }
        
        // 检查是否已经分配过
        const existingAssignment = await SalesProductAssignment.findOne({
            where: {
                salesId,
                productId
            }
        });
        
        if (existingAssignment) {
            return errorResponse(res, 400, '该商品已分配给此销售人员');
        }
        
        // 创建新的分配关系
        await SalesProductAssignment.create({
            salesId,
            productId
        });
        
        return successResponse(res, 201, {
            assignment: {
                salesId,
                productId,
                productName: product.name
            }
        }, '商品分配成功');
    } catch (error) {
        return errorResponse(res, 500, '分配商品失败', error);
    }
};

// 取消销售人员的商品分配
exports.unassignProductFromSalesStaff = async (req, res) => {
    try {
        const { salesId, productId } = req.params;
        
        // 校验权限
        const permissionCheck = checkAdminPermission(req, res);
        if (!permissionCheck.hasPermission) return permissionCheck.response;
        
        // 验证分配关系是否存在
        const assignment = await SalesProductAssignment.findOne({
            where: {
                salesId,
                productId
            }
        });
        
        if (!assignment) {
            return errorResponse(res, 404, '未找到分配关系');
        }
        
        // 删除分配关系
        await assignment.destroy();
        
        return successResponse(res, 200, {}, '商品分配关系取消成功');
    } catch (error) {
        return errorResponse(res, 500, '取消商品分配失败', error);
    }
};

// 获取可分配的商品列表（未分配给任何销售人员或可以重复分配的商品）
exports.getAvailableProducts = async (req, res) => {
    try {
        // 获取所有产品
        const products = await Product.findAll({
            attributes: ['id', 'name', 'category', 'price']
        });
        
        return successResponse(res, 200, { products });
    } catch (error) {
        return errorResponse(res, 500, '获取可分配商品失败', error);
    }
};

// 获取销售人员管理的商品类别
exports.getSalesStaffCategories = async (req, res) => {
    try {
        const salesId = req.userId;
        
        // 验证是否为销售人员
        if (req.user.role !== 'sales' && req.user.role !== 'admin') {
            return errorResponse(res, 403, '无权执行此操作');
        }
        
        // 对于管理员，返回所有类别
        if (req.user.role === 'admin') {
            const allCategories = await Product.findAll({
                attributes: ['category'],
                where: {
                    category: {
                        [Op.not]: null
                    }
                },
                group: ['category']
            });
            
            const categories = allCategories.map(product => product.category).filter(Boolean);
            return successResponse(res, 200, { categories });
        }
        
        // 对于销售人员，返回他负责的商品类别
        const productIds = await getSalesStaffProductIds(salesId);
        
        if (productIds.length === 0) {
            return successResponse(res, 200, { categories: [] });
        }
        
        // 获取这些产品的类别
        const products = await Product.findAll({
            where: { id: productIds },
            attributes: ['category']
        });
        
        // 提取唯一类别
        const categories = [...new Set(products.map(product => product.category))].filter(Boolean);
        
        return successResponse(res, 200, { categories });
    } catch (error) {
        return errorResponse(res, 500, '获取销售人员商品类别失败', error);
    }
};

// 更新销售人员管理的商品信息（价格和库存）
exports.updateSalesProductInfo = async (req, res) => {
    try {
        const { productId } = req.params;
        const { price, stock } = req.body;
        const salesId = req.userId;
        
        // 校验权限
        if (req.user.role !== 'sales' && req.user.role !== 'admin') {
            return errorResponse(res, 403, '无权执行此操作');
        }
        
        // 对于销售人员，检查是否负责该商品
        if (req.user.role === 'sales') {
            const assignment = await SalesProductAssignment.findOne({
                where: {
                    salesId,
                    productId
                }
            });
            
            if (!assignment) {
                return errorResponse(res, 403, '无权操作此商品');
            }
        }
        
        // 获取商品
        const product = await Product.findByPk(productId);
        
        if (!product) {
            return errorResponse(res, 404, '未找到商品');
        }
        
        // 更新商品信息
        const updates = {};
        
        if (price !== undefined) {
            if (price < 0) {
                return errorResponse(res, 400, '价格不能为负数');
            }
            updates.price = price;
        }
        
        if (stock !== undefined) {
            if (stock < 0) {
                return errorResponse(res, 400, '库存不能为负数');
            }
            updates.stock = stock;
        }
        
        // 更新商品
        await product.update(updates);
        
        return successResponse(res, 200, {
            product: {
                id: product.id,
                name: product.name,
                price: product.price,
                stock: product.stock,
                category: product.category
            }
        }, '商品信息更新成功');
    } catch (error) {
        return errorResponse(res, 500, '更新商品信息失败', error);
    }
};

// 获取销售人员的业绩统计
exports.getSalesPerformance = async (req, res) => {
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
        
        // 获取所有销售人员
        const salesStaff = await User.findAll({
            where: { role: 'sales' },
            attributes: ['id', 'username']
        });
        
        // 获取每个销售人员的业绩
        const staffPerformance = await Promise.all(salesStaff.map(async (staff) => {
            // 获取销售人员负责的产品
            const productIds = await getSalesStaffProductIds(staff.id);
            
            // 统计订单数量和销售额
            const orderItems = await OrderItem.findAll({
                where: {
                    productId: { [Op.in]: productIds },
                    ...dateFilter
                },
                include: [{
                    model: Order,
                    as: 'order',
                    where: { status: 'completed' }
                }]
            });
            
            // 计算总销售额
            const totalSales = calculateRevenue(orderItems);
            
            // 获取不重复的订单数
            const orderIds = [...new Set(orderItems.map(item => item.orderId))];
            
            return {
                id: staff.id,
                name: staff.username,
                productsCount: productIds.length,
                ordersCount: orderIds.length,
                totalSales
            };
        }));
        
        return successResponse(res, 200, { staffPerformance });
    } catch (error) {
        return errorResponse(res, 500, '获取销售人员业绩失败', error);
    }
};

// 获取销售人员管理的特定产品的销售状态
exports.getProductSalesStatus = async (req, res) => {
    try {
        const userId = req.userId;
        const { productId } = req.params;
        
        // 验证产品是否存在
        const product = await Product.findByPk(productId);
        if (!product) {
            return errorResponse(res, 404, '产品不存在');
        }
        
        // 验证销售人员是否有权限查看此产品
        if (req.user.role === 'sales') {
            const assignment = await SalesProductAssignment.findOne({
                where: {
                    salesId: userId,
                    productId
                }
            });
            
            if (!assignment) {
                return errorResponse(res, 403, '无权查看此产品');
            }
        }
        
        // 获取产品销售状态
        const last30Days = new Date();
        last30Days.setDate(last30Days.getDate() - 30);
        
        const orderItems = await OrderItem.findAll({
            where: {
                productId,
                createdAt: {
                    [Op.gte]: last30Days
                }
            },
            include: [{
                model: Order,
                as: 'order',
                where: { status: 'completed' }
            }]
        });
        
        // 按日期分组销售数据
        const salesByDate = {};
        orderItems.forEach(item => {
            const date = item.createdAt.toISOString().split('T')[0];
            if (!salesByDate[date]) {
                salesByDate[date] = {
                    quantity: 0,
                    revenue: 0
                };
            }
            salesByDate[date].quantity += item.quantity;
            salesByDate[date].revenue += parseFloat(item.price) * item.quantity;
        });
        
        // 转换为数组
        const salesData = Object.keys(salesByDate).map(date => ({
            date,
            quantity: salesByDate[date].quantity,
            revenue: salesByDate[date].revenue
        }));
        
        // 总销售量和库存状态
        const totalSold = orderItems.reduce((total, item) => total + item.quantity, 0);
        const stockStatus = 
            product.stock === 0 ? 'out_of_stock' :
            product.stock < 5 ? 'danger' :
            product.stock < 20 ? 'warning' : 'normal';
        
        return successResponse(res, 200, {
            product: {
                id: product.id,
                name: product.name,
                price: product.price,
                stock: product.stock,
                stockStatus,
                totalSold,
                salesData
            }
        });
    } catch (error) {
        return errorResponse(res, 500, '获取产品销售状态失败', error);
    }
};

// 获取销售人员摘要数据
exports.getSalesSummary = async (req, res) => {
    const { id } = req.params;
    
    try {
        // 检查请求的销售人员是否存在
        const validation = await validateSalesStaff(id, res, true);
        if (!validation.exists) return validation.response;
        
        // 获取今日日期范围
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        
        // 获取本月日期范围
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        // 获取负责的商品数
        const productCount = await SalesProductAssignment.count({
            where: { salesId: id }
        });
        
        // 获取销售人员负责的商品ID列表
        const productIds = await getSalesStaffProductIds(id);
        
        // 如果没有负责的商品，返回零值统计
        if (productIds.length === 0) {
            return successResponse(res, 200, {
                summary: {
                    todayRevenue: 0,
                    monthRevenue: 0,
                    productCount: 0,
                    pendingOrders: 0
                }
            });
        }
        
        // 获取今日销售额 - 针对销售人员负责的商品
        const todayOrderItems = await OrderItem.findAll({
            where: {
                productId: { [Op.in]: productIds }
            },
            include: [{
                model: Order,
                as: 'order',
                where: {
                    createdAt: { [Op.between]: [startOfToday, endOfToday] },
                    status: 'completed'
                },
                required: true
            }]
        });
        
        // 计算今日销售额
        const todayRevenue = calculateRevenue(todayOrderItems);
        
        // 获取本月销售额 - 针对销售人员负责的商品
        const monthOrderItems = await OrderItem.findAll({
            where: {
                productId: { [Op.in]: productIds }
            },
            include: [{
                model: Order,
                as: 'order',
                where: {
                    createdAt: { [Op.between]: [startOfMonth, endOfMonth] },
                    status: 'completed'
                },
                required: true
            }]
        });
        
        // 计算本月销售额
        const monthRevenue = calculateRevenue(monthOrderItems);
        
        // 获取与销售人员负责商品相关的待处理订单数量
        const pendingOrderItems = await OrderItem.findAll({
            where: {
                productId: { [Op.in]: productIds }
            },
            include: [{
                model: Order,
                as: 'order',
                where: {
                    status: { [Op.in]: ['pending', 'processing', 'paid'] }
                },
                required: true
            }]
        });
        
        // 获取待处理订单的唯一订单ID数量
        const pendingOrderIds = new Set();
        pendingOrderItems.forEach(item => {
            pendingOrderIds.add(item.orderId);
        });
        
        // 构建并返回摘要数据
        const summary = {
            todayRevenue,
            monthRevenue,
            productCount,
            pendingOrders: pendingOrderIds.size
        };
        
        console.log('成功获取销售摘要数据:', summary);
        
        return successResponse(res, 200, { summary });
    } catch (error) {
        return errorResponse(res, 500, '获取销售摘要时出错', error);
    }
};
const db = require('../models');
const User = db.User;
const Product = db.Product;
const Order = db.Order;
const OrderItem = db.OrderItem;
const UserSessionLog = db.UserSessionLog;
const bcrypt = require('bcryptjs');
const { Op } = db.Sequelize;

// 销售员-产品关联模型（如果不存在，则创建）
if (!db.sequelize.models.SalesProductAssignment) {
    db.sequelize.define('SalesProductAssignment', {
        id: {
            type: db.Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        salesId: {
            type: db.Sequelize.INTEGER,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        productId: {
            type: db.Sequelize.INTEGER,
            references: {
                model: 'Products',
                key: 'id'
            }
        }
    }, {
        tableName: 'SalesProductAssignments',
        timestamps: true
    });
}

const SalesProductAssignment = db.sequelize.models.SalesProductAssignment;

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
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '无权执行此操作'
            });
        }
        
        const salesStaff = await User.findAll({
            where: { role: 'sales' },
            attributes: ['id', 'username', 'email', 'createdAt']
        });
        
        res.status(200).json({
            success: true,
            salesStaff
        });
    } catch (error) {
        console.error('获取销售人员列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取销售人员列表失败',
            error: error.message
        });
    }
};

// 获取单个销售人员信息
exports.getSalesStaffDetails = async (req, res) => {
    try {
        const { salesId } = req.params;
        
        // 校验权限
        if (req.user.role !== 'admin' && req.userId !== parseInt(salesId)) {
            return res.status(403).json({
                success: false,
                message: '无权执行此操作'
            });
        }
        
        const salesStaff = await User.findOne({
            where: { 
                id: salesId,
                role: 'sales'
            },
            attributes: ['id', 'username', 'email', 'createdAt']
        });
        
        if (!salesStaff) {
            return res.status(404).json({
                success: false,
                message: '未找到销售人员'
            });
        }
        
        // 获取销售人员负责的商品数量
        const productCount = await SalesProductAssignment.count({
            where: { salesId }
        });
        
        res.status(200).json({
            success: true,
            salesStaff: {
                ...salesStaff.toJSON(),
                productCount
            }
        });
    } catch (error) {
        console.error('获取销售人员详情失败:', error);
        res.status(500).json({
            success: false,
            message: '获取销售人员详情失败',
            error: error.message
        });
    }
};

// 添加销售人员
exports.addSalesStaff = async (req, res) => {
    try {
        // 校验权限
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '无权执行此操作'
            });
        }
        
        const { username, email, password } = req.body;
        
        // 验证必填字段
        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: '用户名、邮箱和密码为必填项'
            });
        }
        
        // 检查邮箱是否已存在
        const existingUser = await User.findOne({
            where: { email }
        });
        
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: '该邮箱已被使用'
            });
        }
        
        // 创建销售人员账号
        const newSalesStaff = await User.create({
            username,
            email,
            password, // 密码会通过User模型的钩子自动加密
            role: 'sales'
        });
        
        res.status(201).json({
            success: true,
            message: '销售人员添加成功',
            salesStaff: {
                id: newSalesStaff.id,
                username: newSalesStaff.username,
                email: newSalesStaff.email,
                createdAt: newSalesStaff.createdAt
            }
        });
    } catch (error) {
        console.error('添加销售人员失败:', error);
        res.status(500).json({
            success: false,
            message: '添加销售人员失败',
            error: error.message
        });
    }
};

// 更新销售人员信息
exports.updateSalesStaff = async (req, res) => {
    try {
        const { salesId } = req.params;
        
        // 校验权限
        if (req.user.role !== 'admin' && req.userId !== parseInt(salesId)) {
            return res.status(403).json({
                success: false,
                message: '无权执行此操作'
            });
        }
        
        const salesStaff = await User.findOne({
            where: {
                id: salesId,
                role: 'sales'
            }
        });
        
        if (!salesStaff) {
            return res.status(404).json({
                success: false,
                message: '未找到销售人员'
            });
        }
        
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
        
        res.status(200).json({
            success: true,
            message: '销售人员信息更新成功',
            salesStaff: {
                id: salesStaff.id,
                username: salesStaff.username,
                email: salesStaff.email,
                active: salesStaff.active,
                createdAt: salesStaff.createdAt
            }
        });
    } catch (error) {
        console.error('更新销售人员信息失败:', error);
        res.status(500).json({
            success: false,
            message: '更新销售人员信息失败',
            error: error.message
        });
    }
};

// 删除销售人员
exports.deleteSalesStaff = async (req, res) => {
    try {
        const { salesId } = req.params;
        
        // 校验权限
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '无权执行此操作'
            });
        }
        
        const salesStaff = await User.findOne({
            where: {
                id: salesId,
                role: 'sales'
            }
        });
        
        if (!salesStaff) {
            return res.status(404).json({
                success: false,
                message: '未找到销售人员'
            });
        }
        
        // 删除销售人员与产品的所有关联
        await SalesProductAssignment.destroy({
            where: { salesId }
        });
        
        // 删除销售人员账号
        await salesStaff.destroy();
        
        res.status(200).json({
            success: true,
            message: '销售人员删除成功'
        });
    } catch (error) {
        console.error('删除销售人员失败:', error);
        res.status(500).json({
            success: false,
            message: '删除销售人员失败',
            error: error.message
        });
    }
};

// 重置销售人员密码
exports.resetSalesStaffPassword = async (req, res) => {
    try {
        const { salesId } = req.params;
        
        // 校验权限
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '无权执行此操作'
            });
        }
        
        const salesStaff = await User.findOne({
            where: {
                id: salesId,
                role: 'sales'
            }
        });
        
        if (!salesStaff) {
            return res.status(404).json({
                success: false,
                message: '未找到销售人员'
            });
        }
        
        const { newPassword } = req.body;
        
        if (!newPassword) {
            return res.status(400).json({
                success: false,
                message: '新密码不能为空'
            });
        }
        
        // 更新密码
        await salesStaff.update({ password: newPassword });
        
        res.status(200).json({
            success: true,
            message: '密码重置成功'
        });
    } catch (error) {
        console.error('重置密码失败:', error);
        res.status(500).json({
            success: false,
            message: '重置密码失败',
            error: error.message
        });
    }
};

// 获取销售人员负责的商品
exports.getSalesStaffProducts = async (req, res) => {
    try {
        const { salesId } = req.params;
        
        // 校验权限
        if (req.user.role !== 'admin' && req.userId !== parseInt(salesId)) {
            return res.status(403).json({
                success: false,
                message: '无权执行此操作'
            });
        }
        
        // 验证销售人员是否存在
        const salesStaff = await User.findOne({
            where: {
                id: salesId,
                role: 'sales'
            }
        });
        
        if (!salesStaff) {
            return res.status(404).json({
                success: false,
                message: '未找到销售人员'
            });
        }
        
        // 获取销售人员负责的商品ID
        const assignments = await SalesProductAssignment.findAll({
            where: { salesId }
        });
        
        if (assignments.length === 0) {
            return res.status(200).json({
                success: true,
                products: []
            });
        }
        
        const productIds = assignments.map(assignment => assignment.productId);
        
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
        
        res.status(200).json({
            success: true,
            products: productsWithStats
        });
    } catch (error) {
        console.error('获取销售人员商品失败:', error);
        res.status(500).json({
            success: false,
            message: '获取销售人员商品失败',
            error: error.message
        });
    }
};

// 分配商品给销售人员
exports.assignProductToSalesStaff = async (req, res) => {
    try {
        const { salesId } = req.params;
        
        // 校验权限
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '无权执行此操作'
            });
        }
        
        // 验证销售人员是否存在
        const salesStaff = await User.findOne({
            where: {
                id: salesId,
                role: 'sales'
            }
        });
        
        if (!salesStaff) {
            return res.status(404).json({
                success: false,
                message: '未找到销售人员'
            });
        }
        
        // 获取要分配的商品ID
        const { productId } = req.body;
        
        if (!productId) {
            return res.status(400).json({
                success: false,
                message: '商品ID不能为空'
            });
        }
        
        // 验证商品是否存在
        const product = await Product.findByPk(productId);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: '未找到商品'
            });
        }
        
        // 检查是否已经分配过
        const existingAssignment = await SalesProductAssignment.findOne({
            where: {
                salesId,
                productId
            }
        });
        
        if (existingAssignment) {
            return res.status(400).json({
                success: false,
                message: '该商品已分配给此销售人员'
            });
        }
        
        // 创建新的分配关系
        await SalesProductAssignment.create({
            salesId,
            productId
        });
        
        res.status(201).json({
            success: true,
            message: '商品分配成功',
            assignment: {
                salesId,
                productId,
                productName: product.name
            }
        });
    } catch (error) {
        console.error('分配商品失败:', error);
        res.status(500).json({
            success: false,
            message: '分配商品失败',
            error: error.message
        });
    }
};

// 取消销售人员的商品分配
exports.unassignProductFromSalesStaff = async (req, res) => {
    try {
        const { salesId, productId } = req.params;
        
        // 校验权限
        if (req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '无权执行此操作'
            });
        }
        
        // 验证分配关系是否存在
        const assignment = await SalesProductAssignment.findOne({
            where: {
                salesId,
                productId
            }
        });
        
        if (!assignment) {
            return res.status(404).json({
                success: false,
                message: '未找到分配关系'
            });
        }
        
        // 删除分配关系
        await assignment.destroy();
        
        res.status(200).json({
            success: true,
            message: '商品分配关系取消成功'
        });
    } catch (error) {
        console.error('取消商品分配失败:', error);
        res.status(500).json({
            success: false,
            message: '取消商品分配失败',
            error: error.message
        });
    }
};

// 获取可分配的商品列表（未分配给任何销售人员或可以重复分配的商品）
exports.getAvailableProducts = async (req, res) => {
    try {
        // 获取所有产品
        const products = await Product.findAll({
            attributes: ['id', 'name', 'category', 'price']
        });
        
        res.status(200).json({
            success: true,
            products
        });
    } catch (error) {
        console.error('获取可分配商品失败:', error);
        res.status(500).json({
            success: false,
            message: '获取可分配商品失败',
            error: error.message
        });
    }
};

// 获取销售人员管理的商品类别
exports.getSalesStaffCategories = async (req, res) => {
    try {
        const salesId = req.userId;
        
        // 验证是否为销售人员
        if (req.user.role !== 'sales' && req.user.role !== 'admin') {
            return res.status(403).json({
                success: false,
                message: '无权执行此操作'
            });
        }
        
        let productIds = [];
        
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
            
            return res.status(200).json({
                success: true,
                categories
            });
        }
        
        // 对于销售人员，返回他负责的商品类别
        const assignments = await SalesProductAssignment.findAll({
            where: { salesId }
        });
        
        if (assignments.length === 0) {
            return res.status(200).json({
                success: true,
                categories: []
            });
        }
        
        productIds = assignments.map(assignment => assignment.productId);
        
        // 获取这些产品的类别
        const products = await Product.findAll({
            where: { id: productIds },
            attributes: ['category']
        });
        
        // 提取唯一类别
        const categories = [...new Set(products.map(product => product.category))].filter(Boolean);
        
        res.status(200).json({
            success: true,
            categories
        });
    } catch (error) {
        console.error('获取销售人员商品类别失败:', error);
        res.status(500).json({
            success: false,
            message: '获取销售人员商品类别失败',
            error: error.message
        });
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
            return res.status(403).json({
                success: false,
                message: '无权执行此操作'
            });
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
                return res.status(403).json({
                    success: false,
                    message: '无权操作此商品'
                });
            }
        }
        
        // 获取商品
        const product = await Product.findByPk(productId);
        
        if (!product) {
            return res.status(404).json({
                success: false,
                message: '未找到商品'
            });
        }
        
        // 更新商品信息
        const updates = {};
        
        if (price !== undefined) {
            if (price < 0) {
                return res.status(400).json({
                    success: false,
                    message: '价格不能为负数'
                });
            }
            updates.price = price;
        }
        
        if (stock !== undefined) {
            if (stock < 0) {
                return res.status(400).json({
                    success: false,
                    message: '库存不能为负数'
                });
            }
            updates.stock = stock;
        }
        
        // 更新商品
        await product.update(updates);
        
        res.status(200).json({
            success: true,
            message: '商品信息更新成功',
            product: {
                id: product.id,
                name: product.name,
                price: product.price,
                stock: product.stock,
                category: product.category
            }
        });
    } catch (error) {
        console.error('更新商品信息失败:', error);
        res.status(500).json({
            success: false,
            message: '更新商品信息失败',
            error: error.message
        });
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
            const assignments = await SalesProductAssignment.findAll({
                where: { salesId: staff.id }
            });
            
            const productIds = assignments.map(a => a.productId);
            
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
            const totalSales = orderItems.reduce((total, item) => {
                return total + (parseFloat(item.price) * item.quantity);
            }, 0);
            
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
        
        res.status(200).json({
            success: true,
            staffPerformance
        });
    } catch (error) {
        console.error('获取销售人员业绩失败:', error);
        res.status(500).json({
            success: false,
            message: '获取销售人员业绩失败',
            error: error.message
        });
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
            return res.status(404).json({
                success: false,
                message: '产品不存在'
            });
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
                return res.status(403).json({
                    success: false,
                    message: '无权查看此产品'
                });
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
        
        res.status(200).json({
            success: true,
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
        console.error('获取产品销售状态失败:', error);
        res.status(500).json({
            success: false,
            message: '获取产品销售状态失败',
            error: error.message
        });
    }
};
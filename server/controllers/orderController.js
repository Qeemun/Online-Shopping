const db = require('../models');  // 修改导入方式
const Order = db.Order;
const Product = db.Product;
const OrderItem = db.OrderItem;
const CartItem = db.CartItem;    // 添加 CartItem 导入
const User = db.User;

// 创建订单并结账
exports.createOrder = async (req, res) => {
    const userId = req.user.id; // 从认证中获取用户ID

    try {
        // 查找用户购物车中的所有商品
        const cartItems = await CartItem.findAll({ 
            where: { user_id: userId },
            include: [{
                model: Product,
                as: 'Product',
                attributes: ['id', 'name', 'price', 'stock']
            }]
        });

        if (cartItems.length === 0) {
            return res.status(400).json({ 
                success: false,
                message: '购物车为空，无法结账' 
            });
        }

        // 计算总金额
        let totalAmount = 0;
        for (let cartItem of cartItems) {
            if (!cartItem.Product) {
                return res.status(400).json({ 
                    success: false,
                    message: `商品 ${cartItem.product_id} 不存在` 
                });
            }
            totalAmount += cartItem.Product.price * cartItem.quantity;
        }

        // 创建订单
        const order = await Order.create({
            user_id: userId,
            total_amount: totalAmount,
            status: '待支付',
            order_date: new Date()
        });

        // 添加订单项
        for (let cartItem of cartItems) {
            await OrderItem.create({
                order_id: order.id,
                product_id: cartItem.Product.id,
                quantity: cartItem.quantity,
                price: cartItem.Product.price
            });
        }

        // 清空购物车
        await CartItem.destroy({ where: { user_id: userId } });

        // 返回订单ID
        res.json({
            success: true,
            orderId: order.id,
            message: '订单创建成功'
        });
    } catch (error) {
        console.error('创建订单失败:', error);
        res.status(500).json({ 
            success: false,
            message: '创建订单时出错',
            error: error.message 
        });
    }
};


// 查看用户历史订单
exports.getOrderHistory = async (req, res) => {
    try {
        const userId = req.user.id; // 使用 req.user.id 而不是 req.userId
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;

        // 修改查询，添加正确的关联别名
        const orders = await Order.findAll({
            where: { user_id: userId },
            order: [['order_date', 'DESC']],
            limit: limit,
            offset: (page - 1) * limit,
            include: [{
                model: OrderItem,
                as: 'orderItems', // 使用正确的别名
                include: [{
                    model: Product,
                    as: 'product', // 使用正确的别名
                    attributes: ['name', 'price']
                }]
            }]
        });

        // 格式化订单数据
        const formattedOrders = orders.map(order => ({
            id: order.id,
            total_amount: Number(order.total_amount),
            status: order.status,
            order_date: order.order_date,
            items: order.orderItems ? order.orderItems.map(item => ({
                id: item.id,
                quantity: item.quantity,
                price: Number(item.price),
                product: {
                    name: item.product?.name || '未知商品',
                    price: Number(item.product?.price || 0)
                }
            })) : []
        }));

        res.status(200).json({
            success: true,
            orders: formattedOrders
        });
    } catch (error) {
        console.error('获取订单历史失败:', error);
        res.status(500).json({
            success: false,
            message: '获取订单历史时出错',
            error: error.message
        });
    }
};

// 更新订单状态（如支付、发货、完成）
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const updates = req.body;

        const order = await Order.findByPk(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: '订单不存在' });
        }

        Object.keys(updates).forEach(key => {
            order[key] = updates[key];
        });

        await order.save();

        res.status(200).json({ success: true, message: '订单更新成功', order });
    } catch (error) {
        console.error('更新订单失败:', error);
        res.status(500).json({ success: false, message: '更新订单失败' });
    }
};

// 获取订单详情
exports.getOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findOne({
            where: { id: orderId },
            include: [
                { model: User, as: 'user', attributes: ['username'] },
                { model: OrderItem, as: 'orderItems', include: [{ model: Product, as: 'product', attributes: ['name', 'price', 'imageUrl'] }] }
            ]
        });

        if (!order) {
            return res.status(404).json({
                success: false,
                message: '订单未找到'
            });
        }

        // 格式化订单数据
        const formattedOrder = {
            id: order.id,
            total_amount: Number(order.total_amount),
            status: order.status,
            order_date: order.order_date,
            items: order.orderItems ? order.orderItems.map(item => ({
                id: item.id,
                quantity: item.quantity,
                price: Number(item.price),
                total: Number(item.price) * item.quantity,
                product: {
                    id: item.product?.id,
                    name: item.product?.name || '未知商品',
                    price: Number(item.product?.price || 0),
                    imageUrl: item.product?.imageUrl
                }
            })) : []
        };

        res.status(200).json({
            success: true,
            order: formattedOrder
        });

    } catch (error) {
        console.error('获取订单信息失败:', error);
        res.status(500).json({
            success: false,
            message: '获取订单信息时出错',
            error: error.message
        });
    }
};

// 获取所有订单
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.findAll({
            include: [
                { model: User, as: 'user', attributes: ['username'] },
                { model: OrderItem, as: 'orderItems', include: [{ model: Product, as: 'product', attributes: ['name', 'price'] }] }
            ]
        });

        // 确保 total_amount 是数字类型
        const formattedOrders = orders.map(order => ({
            ...order.toJSON(),
            total_amount: Number(order.total_amount)
        }));

        res.status(200).json({ success: true, orders: formattedOrders });
    } catch (error) {
        console.error('获取订单失败:', error);
        res.status(500).json({ success: false, message: '获取订单失败' });
    }
};

// 删除订单
exports.deleteOrder = async (req, res) => {
    try {
        const { orderId } = req.params;

        const order = await Order.findByPk(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: '订单不存在' });
        }

        await order.destroy();

        res.status(200).json({ success: true, message: '订单删除成功' });
    } catch (error) {
        console.error('删除订单失败:', error);
        res.status(500).json({ success: false, message: '删除订单失败' });
    }
};

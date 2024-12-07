const Order = require('../models/order');
const Product = require('../models/product');
const OrderItem = require('../models/orderItem');
const User = require('../models/user');

// 创建订单并结账
exports.createOrder = async (req, res) => {
    const userId = req.user.id; // 从认证中获取用户ID

    try {
        // 查找用户购物车中的所有商品
        const cartItems = await CartItem.findAll({ where: { user_id: userId } });

        if (cartItems.length === 0) {
            return res.status(400).json({ message: '购物车为空，无法结账' });
        }

        // 计算总金额
        let totalAmount = 0;
        // 获取购物车中所有商品的ID
        const productIds = cartItems.map(item => item.product_id);
        
        // 批量查询所有商品信息
        const products = await Product.findAll({
            where: { id: productIds },
            attributes: ['id', 'price', 'name']
        });

        // 遍历购物车项，计算订单总金额
        for (let cartItem of cartItems) {
            const product = products.find(p => p.id === cartItem.product_id);
            if (!product) {
                return res.status(400).json({ message: `商品 ${cartItem.product_id} 不存在` });
            }
            totalAmount += product.price * cartItem.quantity;
        }

        // 创建订单
        const order = await Order.create({
            user_id: userId,
            total_amount: totalAmount,
            status: '待支付' // 设置订单状态为待支付
        });

        // 添加订单项
        for (let cartItem of cartItems) {
            const product = products.find(p => p.id === cartItem.product_id);
            if (product) {
                await OrderItem.create({
                    orderId: order.id,
                    productId: product.id,
                    quantity: cartItem.quantity,
                    price: product.price
                });
            }
        }

        // 清空购物车
        await CartItem.destroy({ where: { user_id: userId } });

        // 返回订单ID
        res.status(201).json({ message: '订单创建成功', orderId: order.id });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '创建订单时出错' });
    }
};


// 查看用户历史订单（分页）
exports.getOrderHistory = async (req, res) => {
    try {
        const userId = req.userId;
        const page = parseInt(req.query.page) || 1;  // 默认分页是第一页
        const limit = parseInt(req.query.limit) || 10;  // 默认每页显示10条

        // 查询用户的所有历史订单，支持分页
        const orders = await Order.findAll({
            where: { user_id: userId },
            order: [['order_date', 'DESC']],  // 按照订单日期降序排列
            limit: limit,
            offset: (page - 1) * limit,  // 计算偏移量
            include: [{
                model: OrderItem,
                include: [{
                    model: Product,
                    attributes: ['name', 'price']  // 加载商品的名称和价格
                }]
            }]
        });

        res.status(200).json({ orders });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '获取订单历史时出错' });
    }
};

// 更新订单状态（如支付、发货、完成）
exports.updateOrderStatus = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        // 检查订单状态是否合法
        if (!['待支付', '已支付', '已发货', '已完成'].includes(status)) {
            return res.status(400).json({ message: '无效的订单状态' });
        }

        // 查找订单
        const order = await Order.findByPk(orderId);
        if (!order) {
            return res.status(404).json({ message: '订单不存在' });
        }

        // 只有订单的状态为 '待支付' 或 '已支付' 才能更新
        if (order.status === '已完成' || order.status === '已发货') {
            return res.status(400).json({ message: '已完成或已发货的订单无法更改状态' });
        }

        // 检查订单是否已经支付
        if (order.status === '已支付' && status === '待支付') {
            return res.status(400).json({ message: '支付状态订单无法修改为待支付' });
        }

        // 更新订单状态
        order.status = status;
        await order.save();

        res.status(200).json({ message: '订单状态更新成功', order });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '更新订单状态时出错' });
    }
};

// 获取订单详情
exports.getOrderDetails = async (req, res) => {
    try {
        const { orderId } = req.params;

        if (!orderId) {
            return res.status(400).json({ message: '订单ID无效' });
        }

        // 查找订单
        const order = await Order.findByPk(orderId, {
            include: [{
                model: OrderItem,
                include: [{
                    model: Product,
                    attributes: ['name', 'price']
                }]
            }]
        });

        if (!order) {
            return res.status(404).json({ message: '订单未找到' });
        }

        // 为每个订单项添加 `total` 字段
        const orderItems = order.OrderItems.map(item => ({
            product: item.Product,
            quantity: item.quantity,
            total: item.Product.price * item.quantity  // 添加总价字段
        }));

        res.status(200).json({
            id: order.id,
            items: orderItems,
            shippingFee: order.shippingFee || 0,
            totalAmount: order.total_amount
        });
    } catch (error) {
        console.error('获取订单信息失败', error);
        res.status(500).json({ message: '获取订单信息时出错' });
    }
};

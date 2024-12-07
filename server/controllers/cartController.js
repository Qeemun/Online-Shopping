const CartItem = require('../models/cartItem');
const Product = require('../models/product');
const Order = require('../models/order');

// 添加商品到购物车
exports.addToCart = async (req, res) => {
    const { product_id, quantity } = req.body;
    const user_id = req.user.id; // 通过认证中间件获取用户ID

    try {
        // 检查商品是否存在
        const product = await Product.findByPk(product_id);
        if (!product) {
            return res.status(404).json({ message: '商品不存在' });
        }

        // 检查库存是否足够
        if (product.stock < quantity) {
            return res.status(400).json({ message: '库存不足' });
        }

        // 查找购物车中是否已存在该商品
        let cartItem = await CartItem.findOne({ where: { user_id, product_id } });

        if (cartItem) {
            // 如果已存在，更新数量
            cartItem.quantity += quantity;
            await cartItem.save();
            res.status(200).json({ message: '购物车商品数量已更新', cartItem });
        } else {
            // 如果不存在，创建新的购物车项
            cartItem = await CartItem.create({ user_id, product_id, quantity });
            res.status(200).json({ message: '商品已添加到购物车', cartItem });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '服务器错误' });
    }
};

exports.getCartItems = async (req, res) => {
    const user_id = req.user.id; // 从认证中获取用户ID

    try {
        // 获取当前用户的所有购物车商品
        const cartItems = await CartItem.findAll({ where: { user_id } });

        if (cartItems.length === 0) {
            return res.status(404).json({ message: '购物车为空' });
        }

        res.status(200).json({ cartItems });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '获取购物车商品时出错' });
    }
};

// 删除购物车中的商品
exports.deleteCartItem = async (req, res) => {
    const { cartItemId } = req.body;
    const user_id = req.user.id; // 从认证中获取用户ID

    try {
        const cartItem = await CartItem.findOne({ where: { id: cartItemId, user_id } });
        if (!cartItem) {
            return res.status(404).json({ message: '购物车中不存在该商品' });
        }

        await cartItem.destroy();
        res.status(200).json({ message: '购物车商品已删除' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '删除购物车商品时出错' });
    }
};
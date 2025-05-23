const db = require('../models');  
const CartItem = db.CartItem;  
const Product = db.Product;
const Order = db.Order;

exports.addToCart = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.user.id;

        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ 
                success: false,
                message: '商品不存在' 
            });
        }

        if (product.stock < quantity) {
            return res.status(400).json({ 
                success: false,
                message: '库存不足' 
            });
        }

        let cartItem = await CartItem.findOne({ 
            where: { userId, productId },
            include: [{
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'price', 'imageUrl', 'stock']
            }]
        });

        if (cartItem) {
            const newQuantity = cartItem.quantity + quantity;
            if (newQuantity > product.stock) {
                return res.status(400).json({ 
                    success: false,
                    message: '库存不足' 
                });
            }
            cartItem.quantity = newQuantity;
            await cartItem.save();
        } else {
            cartItem = await CartItem.create({ 
                userId, 
                productId, 
                quantity
            });
            cartItem = await CartItem.findOne({
                where: { id: cartItem.id },
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'price', 'imageUrl', 'stock']
                }]
            });
        }

        res.status(200).json({ 
            success: true,
            message: cartItem ? '更新成功' : '添加成功',
            cartItem 
        });
    } catch (error) {
        console.error('添加购物车失败:', error);
        res.status(500).json({ 
            success: false,
            message: '服务器错误',
            error: error.message 
        });
    }
};

exports.getCartItems = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: '用户未认证' });
        }

        const userId = req.user.id;
        console.log('当前用户ID:', userId); // 调试日志

        const cartItems = await CartItem.findAll({ 
            where: { userId },
            include: [{
                model: Product,
                as: 'product', // 确保使用关联别名
                attributes: ['id', 'name', 'price', 'imageUrl', 'stock']
            }]
        });

        res.status(200).json({ 
            success: true,
            cartItems 
        });
    } catch (error) {
        console.error('获取购物车失败:', error);
        res.status(500).json({ message: '获取购物车商品时出错' });
    }
};

exports.updateCartItem = async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        const userId = req.user.id;

        const cartItem = await CartItem.findOne({ 
            where: { userId, productId },
            include: [{
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'price', 'imageUrl', 'stock']
            }]
        });

        if (!cartItem) {
            return res.status(404).json({ message: '商品不存在于购物车中' });
        }

        if (quantity > cartItem.product.stock) {
            return res.status(400).json({ message: '库存不足' });
        }

        cartItem.quantity = quantity;
        await cartItem.save();

        res.status(200).json({ 
            success: true,
            message: '更新成功',
            cartItem 
        });
    } catch (error) {
        console.error('更新购物车失败:', error);
        res.status(500).json({ message: '更新购物车商品时出错' });
    }
};

exports.removeFromCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.user.id;

        const result = await CartItem.destroy({ 
            where: { userId, productId } 
        });

        if (result === 0) {
            return res.status(404).json({ message: '商品不存在于购物车中' });
        }

        res.status(200).json({ 
            success: true,
            message: '删除成功' 
        });
    } catch (error) {
        console.error('删除购物车商品失败:', error);
        res.status(500).json({ message: '删除购物车商品时出错' });
    }
};
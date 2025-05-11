const db = require('../models');
const User = db.User;
const Product = db.Product;
const ProductViewLog = db.ProductViewLog;

// 记录产品浏览时间
exports.logProductView = async (req, res) => {
    try {
        const { userId, productId, durationSeconds } = req.body;
        
        // 验证数据
        if (!userId || !productId || !durationSeconds) {
            return res.status(400).json({
                success: false,
                message: '请提供userId, productId和durationSeconds'
            });
        }

        // 验证用户存在
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }

        // 验证产品存在
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: '产品不存在'
            });
        }

        // 记录浏览时间
        const log = await ProductViewLog.create({
            userId,
            productId,
            durationSeconds
        });

        res.status(201).json({
            success: true,
            message: '产品浏览时间记录成功',
            log
        });
        
    } catch (error) {
        console.error('记录产品浏览时间失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
};

// 获取用户的产品浏览记录
exports.getUserProductViews = async (req, res) => {
    try {
        const userId = req.params.userId || req.userId;
          const logs = await ProductViewLog.findAll({
            where: { userId },
            include: [{
                model: Product,
                as: 'product',
                attributes: ['id', 'name', 'price', 'category']
            }],
            order: [['createdAt', 'DESC']],
            limit: 50
        });
        
        res.status(200).json({
            success: true,
            logs
        });
    } catch (error) {
        console.error('获取产品浏览记录失败:', error);
        res.status(500).json({
            success: false,
            message: '服务器错误',
            error: error.message
        });
    }
};
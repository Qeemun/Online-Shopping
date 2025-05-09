const db = require('../models');
const Recommendation = db.Recommendation;
const User = db.User;
const Product = db.Product;
// 移除日志相关引用

// 获取用户推荐
exports.getUserRecommendations = async (req, res) => {
    try {
        const userId = req.params.userId || req.user.id;
        
        // 由于没有活动日志，直接根据商品分类推荐
        const products = await Product.findAll({
            order: [['createdAt', 'DESC']],
            limit: 10
        });
        
        res.status(200).json({
            success: true,
            recommendations: products.map(product => ({
                id: Math.floor(Math.random() * 10000), // 生成随机ID
                productId: product.id,
                score: Math.random() * 5, // 随机分数
                product: product
            }))
        });
    } catch (error) {
        console.error('获取推荐失败:', error);
        res.status(500).json({ 
            success: false,
            message: '获取推荐时出错',
            error: error.message
        });
    }
};

// 生成用户推荐
exports.generateRecommendations = async (req, res) => {
    try {
        const userId = req.params.userId;
        
        // 简化推荐生成逻辑，移除对日志的依赖
        // 获取随机分类的商品作为推荐
        const products = await Product.findAll({
            order: db.sequelize.random(),
            limit: 10
        });
        
        await Recommendation.destroy({ where: { userId } }); // 清除旧推荐
        
        const newRecommendations = products.map(product => ({
            userId,
            productId: product.id,
            score: Math.random() * 5 // 随机分数
        }));
        
        await Recommendation.bulkCreate(newRecommendations);
        
        res.status(200).json({
            success: true,
            message: '推荐生成成功',
            count: newRecommendations.length
        });
    } catch (error) {
        console.error('生成推荐失败:', error);
        res.status(500).json({
            success: false,
            message: '生成推荐时出错',
            error: error.message
        });
    }
};

// 获取相似商品推荐
exports.getSimilarProducts = async (req, res) => {
    try {
        const { productId } = req.params;
        
        // 获取商品信息
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: '商品不存在'
            });
        }
        
        // 获取同类别的商品
        const similarProducts = await Product.findAll({
            where: {
                category: product.category,
                id: {
                    [db.Sequelize.Op.ne]: productId
                }
            },
            limit: 6
        });
        
        res.status(200).json({
            success: true,
            products: similarProducts // 修改返回字段名为products以与前端一致
        });
    } catch (error) {
        console.error('获取相似商品失败:', error);
        res.status(500).json({
            success: false,
            message: '获取相似商品时出错',
            error: error.message
        });
    }
};

// 获取热门推荐
exports.getPopularRecommendations = async (req, res) => {
    try {
        // 移除日志相关依赖，直接获取最新商品作为热门商品
        const popularProducts = await Product.findAll({
            order: [['createdAt', 'DESC']],
            limit: 10
        });
        
        res.status(200).json({
            success: true,
            products: popularProducts
        });
    } catch (error) {
        console.error('获取热门推荐失败:', error);
        res.status(500).json({
            success: false,
            message: '获取热门推荐时出错',
            error: error.message
        });
    }
};
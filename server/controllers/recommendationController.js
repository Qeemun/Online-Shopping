const db = require('../models');
const Recommendation = db.Recommendation;
const User = db.User;
const Product = db.Product;
const UserActivityLog = db.UserActivityLog;

// 获取用户推荐
exports.getUserRecommendations = async (req, res) => {
    try {
        const userId = req.params.userId || req.user.id;
        
        // 获取用户的推荐商品
        const recommendations = await Recommendation.findAll({
            where: { userId },
            include: [{
                model: Product,
                attributes: ['id', 'name', 'description', 'price', 'imageUrl', 'category']
            }],
            order: [['score', 'DESC']],
            limit: 10
        });
        
        res.status(200).json({
            success: true,
            recommendations: recommendations.map(rec => ({
                id: rec.id,
                productId: rec.productId,
                score: parseFloat(rec.score),
                product: rec.Product
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
        
        // 1. 获取用户行为数据
        const userActivities = await UserActivityLog.findAll({
            where: { userId },
            include: [{
                model: Product,
                attributes: ['id', 'category']
            }]
        });
        
        // 2. 分析用户偏好
        const categoryScores = {};
        userActivities.forEach(activity => {
            if (!activity.Product || !activity.Product.category) return;
            
            const category = activity.Product.category;
            if (!categoryScores[category]) categoryScores[category] = 0;
            
            // 根据行为类型赋予不同权重
            switch(activity.action) {
                case 'view':
                    categoryScores[category] += 1;
                    break;
                case 'stay':
                    categoryScores[category] += activity.durationSeconds ? 
                        Math.min(activity.durationSeconds / 60, 5) : 2;
                    break;
                case 'purchase':
                    categoryScores[category] += 10;
                    break;
            }
        });
        
        // 3. 获取符合用户偏好的商品
        const favoriteCategories = Object.keys(categoryScores)
            .sort((a, b) => categoryScores[b] - categoryScores[a])
            .slice(0, 3);
            
        const recommendedProducts = await Product.findAll({
            where: {
                category: favoriteCategories,
                // 排除用户已购买的商品
                id: {
                    [db.Sequelize.Op.notIn]: userActivities
                        .filter(a => a.action === 'purchase')
                        .map(a => a.productId)
                }
            },
            limit: 20
        });
        
        // 4. 计算推荐分数并保存
        await Recommendation.destroy({ where: { userId } }); // 清除旧推荐
        
        const newRecommendations = recommendedProducts.map(product => ({
            userId,
            productId: product.id,
            score: categoryScores[product.category] / 10 // 归一化分数
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
        let popularProducts;
        
        // 先尝试根据用户活动获取热门商品
        popularProducts = await Product.findAll({
            include: [{
                model: UserActivityLog,
                attributes: [],
                required: false
            }],
            attributes: [
                'id', 'name', 'description', 'price', 'imageUrl', 'category',
                [db.sequelize.fn('COUNT', db.sequelize.col('UserActivityLogs.id')), 'activityCount']
            ],
            group: ['Product.id'],
            order: [[db.sequelize.literal('activityCount'), 'DESC']],
            limit: 10
        });
        
        // 如果没有足够数据，则直接获取最新商品
        if (!popularProducts || popularProducts.length < 5) {
            popularProducts = await Product.findAll({
                order: [['createdAt', 'DESC']],
                limit: 10
            });
        }
        
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
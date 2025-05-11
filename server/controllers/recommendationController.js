// filepath: d:\JavaCode\Online-Shopping\server\controllers\recommendationController.js
const db = require('../models');
const Recommendation = db.Recommendation;
const User = db.User;
const Product = db.Product;
const { Op } = db.Sequelize;
const UserProfile = db.UserProfile;

/**
 * 推荐系统控制器
 * 基于协同过滤和内容过滤的混合推荐系统
 */

// 获取用户推荐
exports.getUserRecommendations = async (req, res) => {
    try {
        // 获取用户ID - 要么从URL参数，要么从认证的用户对象中获取
        const userId = req.params.userId || (req.user ? req.user.id : null);
        
        // 如果是mine路径请求，必须有req.user
        if (!userId) {
            // 日志记录请求详情，帮助调试
            console.log('用户ID缺失', { 
                path: req.path, 
                params: req.params, 
                hasUser: !!req.user,
                authHeader: req.headers.authorization ? '存在' : '不存在'
            });
            
            return res.status(400).json({
                success: false,
                message: '需要用户ID，请确保您已登录'
            });
        }
        
        // 1. 首先获取已存储的推荐结果（如果有）
        let recommendations = await Recommendation.findAll({
            where: { userId },
            include: [{
                model: db.Product,
                as: 'product',
                attributes: ['id', 'name', 'description', 'price', 'stock', 'category', 'imageUrl']
            }],
            order: [['score', 'DESC']],
            limit: 10
        });
        
        // 2. 如果没有存储的推荐，或者推荐数量不足，实时生成新的推荐
        if (recommendations.length < 5) {
            // 获取用户信息及偏好
            const user = await User.findByPk(userId, {
                include: [{ model: UserProfile, as: 'profile' }]
            });
              // 获取用户订单历史 - 使用更安全的查询方式
            let orders = [];
            try {
                orders = await db.Order.findAll({
                    where: { userId, status: 'completed' },
                    include: [{
                        model: db.OrderItem,
                        as: 'orderItems',  // 指定关联别名
                        include: [{ 
                            model: db.Product,  // 使用db.Product而不是直接使用Product
                            as: 'product'  // 指定关联别名
                        }]
                    }],
                    limit: 20
                });
                console.log(`找到${orders.length}个已完成订单`);
            } catch (orderError) {
                console.error('获取订单历史时出错:', orderError);
                // 即使获取订单失败，也继续执行，使用空数组
                orders = [];
            }
              // 获取用户的商品浏览记录
            let productViews = [];
            try {
                // 首先检查表是否存在
                if (db.sequelize.models.ProductViewLog) {
                    productViews = await db.sequelize.models.ProductViewLog.findAll({
                        where: { userId },
                        order: [['createdAt', 'DESC']],
                        include: [{ model: db.Product, as: 'product' }],
                        limit: 30
                    });
                    console.log(`找到${productViews.length}条浏览记录`);
                } else {
                    console.log('ProductViewLog模型不存在');
                }
            } catch (viewError) {
                console.error('获取浏览记录时出错:', viewError);
                // 继续执行，使用空数组
            }
            
            // 3. 基于用户偏好进行推荐计算
            let userPreferences = {
                categories: {},
                priceRange: {
                    min: Infinity,
                    max: 0,
                    avg: 0
                },
                viewedProducts: new Set(),
                purchasedProducts: new Set()
            };
              // 分析已购买商品
            let totalPurchasedPrice = 0;
            let purchasedCount = 0;
            
            try {
                orders.forEach(order => {
                    if (order.orderItems && Array.isArray(order.orderItems)) {
                        order.orderItems.forEach(item => {
                            if (item && item.product) {
                                try {
                                    // 更新类别偏好
                                    const category = item.product.category;
                                    if (category) {
                                        userPreferences.categories[category] = (userPreferences.categories[category] || 0) + 1;
                                    }
                                    
                                    // 更新价格范围
                                    if (item.product.price) {
                                        const price = parseFloat(item.product.price);
                                        if (!isNaN(price)) {
                                            userPreferences.priceRange.min = Math.min(userPreferences.priceRange.min, price);
                                            userPreferences.priceRange.max = Math.max(userPreferences.priceRange.max, price);
                                            totalPurchasedPrice += price;
                                            purchasedCount++;
                                        }
                                    }
                                    
                                    // 保存购买过的商品ID
                                    if (item.product.id) {
                                        userPreferences.purchasedProducts.add(item.product.id);
                                    }
                                } catch (itemError) {
                                    console.error('处理订单项时出错:', itemError);
                                }
                            }
                        });
                    }
                });
            } catch (orderProcessError) {
                console.error('处理订单数据时出错:', orderProcessError);
            }
            
            // 计算平均价格
            if (purchasedCount > 0) {
                userPreferences.priceRange.avg = totalPurchasedPrice / purchasedCount;
            } else {
                // 如果没有购买历史，设置默认值
                userPreferences.priceRange = {
                    min: 0,
                    max: 10000,
                    avg: 500
                };
            }
              // 分析浏览过的商品
            try {
                productViews.forEach(view => {
                    if (view && view.product) {
                        // 更新类别偏好（浏览的权重较低）
                        const category = view.product.category;
                        if (category) {
                            userPreferences.categories[category] = (userPreferences.categories[category] || 0) + 0.5;
                        }
                        
                        // 保存浏览过的商品ID
                        if (view.product.id) {
                            userPreferences.viewedProducts.add(view.product.id);
                        }
                    }
                });
            } catch (viewProcessError) {
                console.error('处理浏览数据时出错:', viewProcessError);
            }
              // 把用户偏好中的类别转成数组并排序
            let preferredCategories = [];
            try {
                if (userPreferences.categories && Object.keys(userPreferences.categories).length > 0) {
                    preferredCategories = Object.entries(userPreferences.categories)
                        .map(([category, score]) => ({ category, score }))
                        .sort((a, b) => b.score - a.score);
                    console.log('用户类别偏好:', preferredCategories);
                } else {
                    console.log('没有找到用户类别偏好');
                }
            } catch (categoryError) {
                console.error('处理类别偏好时出错:', categoryError);
            }
            
            // 4. 基于用户偏好搜索推荐产品
            let recommendedProducts = [];
            
            // 从偏好类别中选择商品
            if (preferredCategories.length > 0) {
                // 从前三个偏好类别中选择商品
                const topCategories = preferredCategories.slice(0, 3).map(item => item.category);
                
                // 找出用户没有购买过的该类别商品
                const categoryProducts = await db.Product.findAll({
                    where: {
                        category: { [Op.in]: topCategories },
                        id: { 
                            [Op.notIn]: Array.from(userPreferences.purchasedProducts).length > 0 ? 
                                        Array.from(userPreferences.purchasedProducts) : [0] 
                        },
                        stock: { [Op.gt]: 0 } // 有库存
                    },
                    limit: 15
                });
                
                recommendedProducts = categoryProducts;
            }
            
            // 如果首选类别商品不足，添加热门商品
            if (recommendedProducts.length < 10) {
                const additionalCount = 10 - recommendedProducts.length;
                const existingIds = recommendedProducts.map(p => p.id);
                const purchasedIds = Array.from(userPreferences.purchasedProducts);
                const excludeIds = [...existingIds, ...purchasedIds];
                  const popularProducts = await db.Product.findAll({
                    where: {
                        id: {
                            [Op.notIn]: excludeIds.length > 0 ? excludeIds : [0]
                        },
                        stock: { [Op.gt]: 0 } // 有库存
                    },
                    order: [['createdAt', 'DESC']],
                    limit: additionalCount
                });
                
                recommendedProducts = [...recommendedProducts, ...popularProducts];
            }
            
            // 5. 为每个推荐商品计算个性化得分
            const scoredRecommendations = [];
            
            for (const product of recommendedProducts) {
                // 基础分数从3开始
                let score = 3;
                
                // 类别匹配度加分
                const categoryPref = preferredCategories.find(c => c.category === product.category);
                if (categoryPref) {
                    // 类别偏好得分最高2分
                    score += Math.min(categoryPref.score / 2, 2);
                }
                
                // 浏览过的商品降低分数
                if (userPreferences.viewedProducts.has(product.id)) {
                    score -= 0.5;
                }
                
                // 商品新鲜度加分（7天内上架的商品）
                const productAge = (new Date() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24);
                if (productAge < 7) {
                    score += (7 - productAge) / 7; // 最多额外加1分
                }
                
                // 存储推荐结果
                const recommendation = {
                    userId,
                    productId: product.id,
                    score: parseFloat(score.toFixed(2))
                };
                
                // 将当前计算的推荐添加到结果中
                scoredRecommendations.push({
                    ...recommendation,
                    product
                });
                
                // 异步更新或创建推荐记录到数据库
                Recommendation.findOrCreate({
                    where: { userId, productId: product.id },
                    defaults: recommendation
                }).then(([rec, created]) => {
                    if (!created) {
                        // 如果记录已存在，更新分数
                        rec.score = recommendation.score;
                        return rec.save();
                    }
                }).catch(err => {
                    console.error('保存推荐记录失败:', err);
                });
            }
            
            // 按分数排序
            scoredRecommendations.sort((a, b) => b.score - a.score);
            
            // 添加到结果
            recommendations = [...scoredRecommendations, ...recommendations]
                .slice(0, 10); // 限制返回数量
        }
          // 确保返回的推荐是有效的
        try {
            // 过滤掉无效的推荐
            recommendations = recommendations.filter(rec => 
                rec && rec.product && rec.product.id && rec.product.name
            );
              console.log(`为用户 ${userId} 返回 ${recommendations.length} 条推荐`);
            
            // 确保每个推荐项都有产品数据，如果没有，则创建一个新的产品对象
            recommendations = recommendations.filter(rec => rec && rec.productId)
                .map(rec => {
                    // 如果没有product属性或者product属性不完整，从数据库查找
                    if (!rec.product || !rec.product.id) {
                        // 为前端创建一个临时product对象，不影响数据库
                        return {
                            ...rec.dataValues || rec,
                            product: {
                                id: rec.productId,
                                name: '推荐商品',
                                description: '根据您的兴趣推荐',
                                price: '0.00',
                                stock: 1,
                                category: '推荐',
                                imageUrl: '/images/products/default.jpg'
                            }
                        };
                    }
                    return rec;
                });
            
            // 检查第一条推荐的数据结构
            if (recommendations.length > 0) {
                console.log('第一条推荐数据结构:', 
                    JSON.stringify({
                        hasProduct: !!recommendations[0].product,
                        productId: recommendations[0].productId,
                        productObject: recommendations[0].product ? 
                            {id: recommendations[0].product.id, name: recommendations[0].product.name} : 
                            'null'
                    })
                );
                
                // 记录详细的推荐数据结构
                console.log('响应中的recommendations结构:', 
                    JSON.stringify(recommendations.slice(0, 2).map(rec => ({
                        id: rec.id,
                        userId: rec.userId,
                        productId: rec.productId,
                        score: rec.score,
                        hasProduct: !!rec.product,
                        productDetails: rec.product ? {
                            id: rec.product.id,
                            name: rec.product.name
                        } : null
                    })))
                );            } else {
                console.log('没有找到推荐数据，将使用默认推荐');
                // 获取默认推荐
                recommendations = await getDefaultRecommendations(userId);
                console.log(`生成了${recommendations.length}条默认推荐`);
            }
            
            res.status(200).json({
                success: true,
                recommendations: recommendations || []
            });
        } catch (responseError) {
            console.error('格式化推荐响应时出错:', responseError);
            // 返回空数组而不是错误，这样前端至少能正常显示
            res.status(200).json({
                success: true,
                recommendations: []
            });
        }
    } catch (error) {
        console.error('获取用户推荐失败:', error);
        // 提供更详细的错误信息以便调试
        res.status(500).json({
            success: false,
            message: '获取推荐失败',
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
};

// 生成用户推荐
exports.generateRecommendations = async (req, res) => {
    try {
        const { userId } = req.params;
        
        // 验证用户存在
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: '用户不存在'
            });
        }
        
        // 获取用户订单历史
        const orders = await db.Order.findAll({
            where: { userId, status: 'completed' },
            include: [{
                model: db.OrderItem,
                as: 'orderItems',                include: [{ 
                    model: db.Product, 
                    as: 'product'
                }]
            }],
            limit: 20
        });
        
        // 分析用户偏好
        let userPreferences = {
            categories: {},
            priceRange: {
                min: Infinity,
                max: 0,
                avg: 0
            },
            purchasedProducts: new Set()
        };
        
        // 分析已购买商品
        let totalPurchasedPrice = 0;
        let purchasedCount = 0;
        
        orders.forEach(order => {
            order.orderItems?.forEach(item => {
                if (item.product) {
                    const category = item.product.category;
                    userPreferences.categories[category] = (userPreferences.categories[category] || 0) + 1;
                    
                    const price = parseFloat(item.product.price);
                    userPreferences.priceRange.min = Math.min(userPreferences.priceRange.min, price);
                    userPreferences.priceRange.max = Math.max(userPreferences.priceRange.max, price);
                    totalPurchasedPrice += price;
                    purchasedCount++;
                    
                    userPreferences.purchasedProducts.add(item.product.id);
                }
            });
        });
        
        // 计算平均价格
        if (purchasedCount > 0) {
            userPreferences.priceRange.avg = totalPurchasedPrice / purchasedCount;
        } else {
            userPreferences.priceRange = {
                min: 0,
                max: 10000,
                avg: 500
            };
        }
        
        // 获取可能的推荐商品
        const preferredCategories = Object.entries(userPreferences.categories)
            .map(([category, score]) => ({ category, score }))
            .sort((a, b) => b.score - a.score);
        
        let potentialProducts = [];
        
        if (preferredCategories.length > 0) {
            // 从前三个偏好类别中选择商品
            const topCategories = preferredCategories.slice(0, 3).map(item => item.category);
              potentialProducts = await db.Product.findAll({
                where: {
                    category: { [Op.in]: topCategories },
                    id: { 
                        [Op.notIn]: Array.from(userPreferences.purchasedProducts).length > 0 ? 
                                  Array.from(userPreferences.purchasedProducts) : [0] 
                    },
                    stock: { [Op.gt]: 0 }
                },
                limit: 30
            });
        }
        
        // 如果首选类别商品不足，添加更多商品
        if (potentialProducts.length < 20) {
            const additionalCount = 20 - potentialProducts.length;
            const existingIds = potentialProducts.map(p => p.id);
            const purchasedIds = Array.from(userPreferences.purchasedProducts);
              const moreProducts = await db.Product.findAll({
                where: {
                    id: {
                        [Op.notIn]: [...existingIds, ...purchasedIds].length > 0 ? 
                                  [...existingIds, ...purchasedIds] : [0]
                    },
                    stock: { [Op.gt]: 0 }
                },
                order: [['createdAt', 'DESC']],
                limit: additionalCount
            });
            
            potentialProducts = [...potentialProducts, ...moreProducts];
        }
        
        // 为每个商品计算个性化分数并保存
        let savedCount = 0;
        
        for (const product of potentialProducts) {
            // 基础分数
            let score = 3;
            
            // 类别匹配度
            const categoryPref = preferredCategories.find(c => c.category === product.category);
            if (categoryPref) {
                score += Math.min(categoryPref.score / 2, 2);
            }
            
            // 价格匹配度
            if (purchasedCount > 0) {
                const priceDiff = Math.abs(product.price - userPreferences.priceRange.avg) / userPreferences.priceRange.avg;
                if (priceDiff <= 0.3) {
                    score += 1 - priceDiff; // 价格越接近平均值，分数越高
                }
            }
            
            // 商品新鲜度
            const productAge = (new Date() - new Date(product.createdAt)) / (1000 * 60 * 60 * 24);
            if (productAge < 14) {
                score += (14 - productAge) / 14; // 最多额外加1分
            }
            
            // 保存或更新推荐
            try {
                const [recommendation, created] = await Recommendation.findOrCreate({
                    where: { userId, productId: product.id },
                    defaults: {
                        userId,
                        productId: product.id,
                        score: parseFloat(score.toFixed(2))
                    }
                });
                
                if (!created) {
                    recommendation.score = parseFloat(score.toFixed(2));
                    await recommendation.save();
                }
                
                savedCount++;
            } catch (err) {
                console.error('保存推荐失败:', err);
            }
        }
        
        res.status(200).json({
            success: true,
            message: `成功为用户生成 ${savedCount} 条推荐`
        });
    } catch (error) {
        console.error('生成推荐失败:', error);
        res.status(500).json({
            success: false,
            message: '生成推荐失败',
            error: error.message
        });
    }
};

// 获取相似商品推荐
exports.getSimilarProducts = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user?.id;
        
        // 获取商品信息
        const product = await db.Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: '商品不存在'
            });
        }
        
        // 准备查询条件
        const baseConditions = {
            id: { [Op.ne]: productId }, // 排除当前商品
            stock: { [Op.gt]: 0 }       // 确保有库存
        };
        
        // 1. 首先获取同类别、价格相近的商品
        let similarityScore = {};
          const similarCategoryProducts = await db.Product.findAll({
            where: {
                ...baseConditions,
                category: product.category,
                price: {
                    [Op.between]: [
                        parseFloat(product.price) * 0.7, // 价格下限: 当前商品价格的70%
                        parseFloat(product.price) * 1.3  // 价格上限: 当前商品价格的130%
                    ]
                }
            },
            limit: 10
        });
        
        // 计算基于类别和价格的相似度分数
        similarCategoryProducts.forEach(p => {
            const priceDiff = Math.abs(parseFloat(p.price) - parseFloat(product.price)) / parseFloat(product.price);
            // 价格差越小，分数越高
            const priceScore = 1 - Math.min(priceDiff, 1);
            similarityScore[p.id] = 0.7 + (priceScore * 0.3); // 类别匹配基础分0.7，价格匹配最高0.3分
        });
        
        // 2. 如果用户已登录，获取购买过当前商品的用户也购买了哪些其他商品
        let alsoBoughtProducts = [];
        if (userId) {
            // 查找购买了当前商品的其他用户
            const usersBoughtThis = await db.OrderItem.findAll({
                where: { productId },
                include: [{ model: db.Order, as: 'order', attributes: ['userId'] }],
                attributes: []
            });
            
            const userIds = usersBoughtThis.map(item => item.order.userId)
                .filter(id => id !== userId); // 排除当前用户
            
            if (userIds.length > 0) {
                // 这些用户还购买了哪些商品
                const otherProductsBought = await db.OrderItem.findAll({
                    where: {
                        productId: { [Op.ne]: productId }
                    },
                    include: [
                        { 
                            model: db.Order,
                            as: 'order', // 添加别名
                            where: { userId: { [Op.in]: userIds } },
                            attributes: []
                        },
                        {
                            model: db.Product,
                            as: 'product', // 添加别名
                            where: baseConditions
                        }
                    ]
                });
                
                // 统计每个商品被其他用户购买的次数
                const productCounts = {};
                otherProductsBought.forEach(item => {
                    const pid = item.productId;
                    productCounts[pid] = (productCounts[pid] || 0) + 1;
                });
                
                // 转换为数组并排序
                const alsoBoughtIds = Object.entries(productCounts)
                    .map(([pid, count]) => ({
                        id: parseInt(pid),
                        count
                    }))
                    .sort((a, b) => b.count - a.count)
                    .slice(0, 5)
                    .map(item => item.id);            // 查询商品详情
                if (alsoBoughtIds.length > 0) {
                    const products = await db.Product.findAll({
                        where: {
                            id: { [Op.in]: alsoBoughtIds }
                        }
                    });
                    
                    // 添加协同过滤的相似度分数
                    products.forEach(p => {
                        // 如果已有基于内容的相似度分数，取两者的加权平均
                        if (similarityScore[p.id]) {
                            similarityScore[p.id] = similarityScore[p.id] * 0.6 + 0.4;
                        } else {
                            // 协同过滤推荐的基础分为0.9
                            similarityScore[p.id] = 0.9;
                        }
                    });
                    
                    // 将协同过滤的结果添加到待推荐列表
                    alsoBoughtProducts = products;
                }
            }
        }
        
        // 3. 整合并排序所有推荐
        let allProducts = [...similarCategoryProducts];
        
        // 添加"经常一起购买"的商品（如果有）
        alsoBoughtProducts.forEach(p => {
            if (!allProducts.some(existing => existing.id === p.id)) {
                allProducts.push(p);
            }
        });
        
        // 根据相似度分数排序
        allProducts.sort((a, b) => {
            return (similarityScore[b.id] || 0) - (similarityScore[a.id] || 0);
        });
        
        // 限制返回数量
        allProducts = allProducts.slice(0, 6);
        
        res.status(200).json({
            success: true,
            products: allProducts
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
        const popularProducts = await db.Product.findAll({
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

// 获取默认推荐商品（当没有个性化推荐时）
async function getDefaultRecommendations(userId, limit = 5) {
    try {
        // 获取热门商品作为默认推荐
        const defaultProducts = await db.Product.findAll({
            where: {
                stock: { [Op.gt]: 0 } // 确保有库存
            },
            order: [['createdAt', 'DESC']], // 最新商品优先
            limit
        });
        
        // 转换为推荐记录格式
        return defaultProducts.map(product => ({
            userId,
            productId: product.id,
            score: 3.0, // 默认分数
            product    // 直接包含产品对象
        }));
    } catch (error) {
        console.error('获取默认推荐时出错:', error);
        return [];
    }
}

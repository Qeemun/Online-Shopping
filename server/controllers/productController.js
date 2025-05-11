const db = require('../models');
const Product = db.Product;
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 确保上传目录存在
const uploadDir = path.join(__dirname, '../../public/images/products');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// 配置文件存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir); // 使用项目根目录下的public/images/products
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'product-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// 配置 multer
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 限制5MB
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (extname && mimetype) {
            return cb(null, true);
        } else {
            cb(new Error('只允许上传图片文件!'));
        }
    }
});

// 导出 multer 配置
exports.upload = upload;

// 修改getAllProducts函数以支持类别筛选和分页

exports.getAllProducts = async (req, res) => {
    try {
        let whereCondition = {};
        
        // 仅按商品名称搜索
        if (req.query.search) {
            const searchTerm = req.query.search.trim();
            whereCondition = {
                name: { 
                    [db.Sequelize.Op.like]: `%${searchTerm}%` 
                }
            };
        }
        
        // 添加类别筛选条件
        if (req.query.category) {
            whereCondition.category = req.query.category;
        }

        // 分页参数
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 12;
        const offset = (page - 1) * limit;
        
        // 查询总数
        const total = await Product.count({ where: whereCondition });
        
        // 使用条件查询产品（带分页）
        const products = await Product.findAll({ 
            where: whereCondition,
            order: [['createdAt', 'DESC']],
            limit: limit,
            offset: offset
        });
        
        // 格式化产品数据
        const formattedProducts = products.map(product => {
            const productJson = product.toJSON();
            
            // 处理图片URL
            if (productJson.imageUrl && !productJson.imageUrl.startsWith('http')) {
                productJson.imageUrl = `http://localhost:3000${productJson.imageUrl}`;
            }
            
            return productJson;
        });

        res.status(200).json({
            success: true,
            products: formattedProducts,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                hasMore: page < Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('获取产品列表失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '获取产品列表时出错' 
        });
    }
};

// 获取单个产品的详细信息
exports.getProductDetails = async (req, res) => {
    const productId = req.params.productId;

    try {
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ 
                success: false, 
                message: '未找到该产品' 
            });
        }

        res.status(200).json({
            success: true,
            product: product
        });
    } catch (error) {
        console.error('获取产品详情失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '获取产品详情失败', 
            error: error.message 
        });
    }
};

// 创建新产品
exports.createProduct = async (req, res) => {
    try {
        const { name, description, price, stock, category } = req.body;
        // 更新图片URL路径格式
        const imageUrl = req.file ? `/images/products/${req.file.filename}` : null;
        
        // 输入验证
        if (!name || !price) {
            return res.status(400).json({
                success: false,
                message: '产品名称和价格为必填项'
            });
        }

        const newProduct = await Product.create({
            name,
            description,
            price,
            stock: stock || 0,
            category,
            imageUrl
        });

        res.status(201).json({
            success: true,
            product: newProduct,
            message: '产品创建成功'
        });
    } catch (error) {
        console.error('创建产品失败:', error);
        res.status(500).json({ 
            success: false, 
            message: '创建产品时出错',
            error: error.message
        });
    }
};

// 更新产品信息
exports.updateProduct = async (req, res) => {
    const productId = req.params.productId;
    const updates = req.body;

    try {
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: '未找到该产品'
            });
        }

        // 验证价格
        if (updates.price && updates.price < 0) {
            return res.status(400).json({
                success: false,
                message: '价格不能为负'
            });
        }

        // 验证库存
        if (updates.stock && updates.stock < 0) {
            return res.status(400).json({
                success: false,
                message: '库存不能为负'
            });
        }

        // 更新图片，使用新的路径格式
        if (req.file) {
            updates.imageUrl = `/images/products/${req.file.filename}`;
        }

        await product.update(updates);

        res.status(200).json({
            success: true,
            product: product,
            message: '产品更新成功'
        });
    } catch (error) {
        console.error('更新产品失败:', error);
        res.status(500).json({
            success: false,
            message: '更新产品时出错',
            error: error.message
        });
    }
};

// 删除产品
exports.deleteProduct = async (req, res) => {
    const productId = req.params.productId;
    // 使用事务确保原子性操作
    const transaction = await db.sequelize.transaction();

    try {
        const product = await Product.findByPk(productId);
        if (!product) {
            await transaction.rollback();
            return res.status(404).json({
                success: false,
                message: '产品未找到'
            });
        }

        // 1. 删除与产品相关的浏览日志记录
        const ProductViewLog = db.sequelize.models.ProductViewLog;
        if (ProductViewLog) {
            await ProductViewLog.destroy({
                where: { productId: productId },
                transaction
            });
        }

        // 2. 删除购物车中的相关项目
        const CartItem = db.CartItem;
        if (CartItem) {
            await CartItem.destroy({
                where: { productId: productId },
                transaction
            });
        }

        // 3. 删除销售人员产品分配记录
        const SalesProductAssignment = db.sequelize.models.SalesProductAssignment;
        if (SalesProductAssignment) {
            await SalesProductAssignment.destroy({
                where: { productId: productId },
                transaction
            });
        }        // 4. 检查是否存在与此产品相关的订单项
        const OrderItem = db.sequelize.models.OrderItem;
        if (OrderItem) {
            const orderItems = await OrderItem.findAll({
                where: { productId: productId }
            });
            
            if (orderItems && orderItems.length > 0) {
                // 存在相关订单项，不能简单删除产品
                await transaction.rollback();
                return res.status(400).json({
                    success: false,
                    message: '无法删除此产品，因为它已经被包含在订单中。请考虑将其标记为停售而不是删除。'
                });
            }
        }

        // 5. 最后删除产品本身
        await product.destroy({ transaction });

        // 提交事务
        await transaction.commit();

        res.status(200).json({
            success: true,
            message: '产品删除成功'
        });
    } catch (error) {
        // 回滚事务
        await transaction.rollback();
        console.error('删除产品失败:', error);
        res.status(500).json({
            success: false,
            message: '删除产品时出错',
            error: error.message
        });
    }
};

// 获取所有商品类别
exports.getAllCategories = async (req, res) => {
    try {
        // 从categories表中获取所有类别
        const Category = db.Category;
        const categoriesData = await Category.findAll({
            attributes: ['id', 'name']
        });
        
        // 提取类别名称数组
        const categories = categoriesData.map(category => category.name);
        
        // 还需要检查产品表中是否有不在categories表中的类别
        const products = await Product.findAll({
            attributes: ['category'],
            where: {
                category: {
                    [db.Sequelize.Op.not]: null
                }
            }
        });
        
        // 合并并去重，确保没有丢失任何类别
        const productCategories = [...new Set(products.map(product => product.category))].filter(Boolean);
        const uniqueCategories = [...new Set([...categories, ...productCategories])];
        
        res.status(200).json({
            success: true,
            categories: uniqueCategories,
            // 同时提供详细数据以便前端使用
            categoriesData: categoriesData
        });
    } catch (error) {
        console.error('获取类别列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取类别列表失败',
            error: error.message
        });
    }
};

// 获取指定类别的所有商品
exports.getProductsByCategory = async (req, res) => {
    try {
        const { category } = req.params;
        
        // 查询指定类别的所有商品
        const products = await Product.findAll({
            where: { category }
        });
        
        res.status(200).json({
            success: true,
            category,
            products
        });
    } catch (error) {
        console.error('获取类别商品失败:', error);
        res.status(500).json({
            success: false,
            message: '获取类别商品失败',
            error: error.message
        });
    }
};

// 添加新商品类别
exports.addCategory = async (req, res) => {
    try {
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                message: '类别名称不能为空'
            });
        }
        
        // 首先检查category表中是否已存在该类别
        const Category = db.Category;
        let existingCategory = await Category.findOne({
            where: { name }
        });
        
        if (existingCategory) {
            return res.status(400).json({
                success: false,
                message: '该类别已存在'
            });
        }
        
        // 检查产品表中是否已使用该类别名
        const existingProducts = await Product.findAll({
            where: { category: name },
            limit: 1
        });
        
        // 创建新类别记录
        const newCategory = await Category.create({
            name,
            // 如果模型支持description字段
            ...(description && { description })
        });
        
        let placeholderProduct = null;
        
        // 如果没有使用该类别的产品，创建一个示例产品
        if (existingProducts.length === 0) {
            placeholderProduct = await Product.create({
                name: `${name} - 示例产品`,
                description: description || `${name}类别的示例产品`,
                price: 0,
                stock: 0,
                category: name
            });
        }
        
        res.status(201).json({
            success: true,
            message: '类别添加成功',
            category: {
                id: newCategory.id,
                name,
                description,
                firstProduct: placeholderProduct
            }
        });
    } catch (error) {
        console.error('添加类别失败:', error);
        res.status(500).json({
            success: false,
            message: '添加类别失败',
            error: error.message
        });
    }
};

// 删除商品类别
exports.deleteCategory = async (req, res) => {
    try {
        const { category } = req.params;
        
        // 查询该类别的所有商品
        const products = await Product.findAll({
            where: { category }
        });
        
        // 首先检查category表中是否存在该类别
        const Category = db.Category;
        const categoryRecord = await Category.findOne({
            where: { name: category }
        });
        
        if (!categoryRecord && products.length === 0) {
            return res.status(404).json({
                success: false,
                message: '类别不存在'
            });
        }
        
        // 检查当前用户权限
        if (req.user.role === 'sales') {
            // 如果是销售人员，还需要检查是否分配了这些产品
            const SalesProductAssignment = db.sequelize.models.SalesProductAssignment;
            
            // 获取所有产品ID
            const productIds = products.map(product => product.id);
            
            // 检查是否所有产品都分配给了该销售人员
            const assignments = await SalesProductAssignment.findAll({
                where: {
                    productId: {
                        [db.Sequelize.Op.in]: productIds
                    },
                    salesId: req.userId
                }
            });
            
            if (assignments.length !== productIds.length) {
                return res.status(403).json({
                    success: false,
                    message: '无权操作此类别的部分商品'
                });
            }
        }
        
        // 将所有该类别的商品的类别设为null
        await Product.update(
            { category: null },
            { where: { category } }
        );
        
        // 从categories表中删除类别记录
        if (categoryRecord) {
            await categoryRecord.destroy();
        }
        
        res.status(200).json({
            success: true,
            message: '类别删除成功',
            affectedProducts: products.length
        });
    } catch (error) {
        console.error('删除类别失败:', error);
        res.status(500).json({
            success: false,
            message: '删除类别失败',
            error: error.message
        });
    }
};

// 更新商品类别
exports.updateCategory = async (req, res) => {
    try {
        const { oldName } = req.params;
        const { name, description } = req.body;
        
        if (!name) {
            return res.status(400).json({
                success: false,
                message: '类别名称不能为空'
            });
        }
        
        // 检查新名称是否已存在（排除自身）
        if (oldName !== name) {
            const Category = db.Category;
            const existingCategory = await Category.findOne({
                where: { name }
            });
            
            if (existingCategory) {
                return res.status(400).json({
                    success: false,
                    message: '该类别名称已存在'
                });
            }
        }
        
        // 更新Category表中的记录
        const Category = db.Category;
        const categoryRecord = await Category.findOne({
            where: { name: oldName }
        });
        
        if (!categoryRecord) {
            return res.status(404).json({
                success: false,
                message: '类别不存在'
            });
        }
        
        // 更新类别记录
        await categoryRecord.update({ name });
        
        // 更新所有使用该类别的产品
        await Product.update(
            { category: name },
            { where: { category: oldName } }
        );
        
        res.status(200).json({
            success: true,
            message: '类别更新成功',
            category: {
                id: categoryRecord.id,
                name,
                description
            }
        });
    } catch (error) {
        console.error('更新类别失败:', error);
        res.status(500).json({
            success: false,
            message: '更新类别失败',
            error: error.message
        });
    }
};

// 修改产品状态（活跃/停售）
exports.updateProductStatus = async (req, res) => {
    const productId = req.params.productId;
    const { status } = req.body;
    
    // 验证状态值
    if (!status || !['active', 'discontinued'].includes(status)) {
        return res.status(400).json({
            success: false,
            message: '无效的产品状态。允许的值: active, discontinued'
        });
    }
    
    try {
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: '产品未找到'
            });
        }
        
        // 更新产品状态
        await product.update({ status });
        
        res.status(200).json({
            success: true,
            message: `产品状态已更新为 ${status}`,
            product
        });
    } catch (error) {
        console.error('更新产品状态失败:', error);
        res.status(500).json({
            success: false,
            message: '更新产品状态失败',
            error: error.message
        });
    }
};

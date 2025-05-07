const db = require('../models');
const Product = db.Product;
const multer = require('multer');
const path = require('path');

// 配置文件存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'public/uploads/') // 确保此目录存在
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
        cb(null, uniqueSuffix + path.extname(file.originalname))
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
        const { name, description, price, stock } = req.body;
        const imageUrl = req.file ? `/uploads/${req.file.filename}` : null;
        
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

        // 更新图片
        if (req.file) {
            updates.imageUrl = `/uploads/${req.file.filename}`;
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

    try {
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({
                success: false,
                message: '产品未找到'
            });
        }

        await product.destroy();

        res.status(200).json({
            success: true,
            message: '产品删除成功'
        });
    } catch (error) {
        console.error('删除产品失败:', error);
        res.status(500).json({
            success: false,
            message: '删除产品时出错',
            error: error.message
        });
    }
};

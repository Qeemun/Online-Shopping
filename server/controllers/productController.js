const Product = require('../models/product');

// 获取所有产品
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.findAll();  // 获取所有产品
        const productData = products.map(product => product.dataValues); // 将 Sequelize 实例转换为普通对象数组

        // 返回纯数据数组，直接将数据作为 JSON 响应
        res.status(200).json(productData);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: '获取产品列表时出错' });
    }
};

// 获取单个产品的详细信息
exports.getProductDetails = async (req, res) => {
    const productId = req.params.productId;

    try {
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: '未找到该产品' });
        }

        // 返回产品数据时只传递 dataValues（即产品的实际数据）
        res.status(200).json(product.dataValues);
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: '获取产品详情失败', error: error.message });
    }
};

// 创建新产品
exports.createProduct = async (req, res) => {
    const { name, description, price, stock, imageUrl } = req.body;
    try {
        const newProduct = await Product.create({ name, description, price, stock, imageUrl });

        // 返回新创建的产品数据（确保是普通对象）
        res.status(201).json({
            success: true,
            product: newProduct.dataValues,  // 返回普通对象
            message: '新产品已添加'
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: '创建产品时出错' });
    }
};

// 更新产品信息
exports.updateProduct = async (req, res) => {
    const productId = req.params.productId;
    const { name, description, price, stock, imageUrl } = req.body;

    // 输入验证
    if (price && price < 0) {
        return res.status(400).json({ message: '价格不能为负' });
    }

    try {
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ message: '未找到该产品' });
        }

        // 更新产品信息
        product.name = name || product.name;
        product.description = description || product.description;
        product.price = price || product.price;
        product.stock = stock || product.stock;
        product.imageUrl = imageUrl || product.imageUrl;

        await product.save();
        res.status(200).json({ success: true, message: '产品信息已更新', product: product.dataValues });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '更新产品信息失败', error: error.message });
    }
};


// 删除产品
exports.deleteProduct = async (req, res) => {
    const productId = req.params.productId;
    try {
        const product = await Product.findByPk(productId);
        if (!product) {
            return res.status(404).json({ success: false, message: '产品未找到' });
        }

        await product.destroy();  // 删除产品
        res.status(200).json({ success: true, message: '产品已删除' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: '删除产品时出错' });
    }
};


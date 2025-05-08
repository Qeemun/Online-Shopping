const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');
const { verifyToken } = require('../controllers/userController');

// 获取所有产品
router.get('/', productController.getAllProducts);

// 获取单个产品的详细信息
router.get('/:productId', productController.getProductDetails);

// 创建新产品，使用 multer 中间件处理文件上传
router.post('/', verifyToken(), productController.upload.single('image'), productController.createProduct);

// 更新产品信息，使用 multer 中间件处理文件上传
router.put('/:productId', verifyToken(), productController.upload.single('image'), productController.updateProduct);

// 删除产品
router.delete('/:productId', verifyToken(), productController.deleteProduct);

// 获取所有商品类别
router.get('/categories/all', productController.getAllCategories);

// 获取指定类别的所有商品
router.get('/category/:category', productController.getProductsByCategory);

// 添加新商品类别
router.post('/categories', verifyToken(), productController.addCategory);

// 删除商品类别
router.delete('/categories/:category', verifyToken(), productController.deleteCategory);

module.exports = router;

const express = require('express');
const router = express.Router();
const productController = require('../controllers/productController');

// 获取所有产品
router.get('/', productController.getAllProducts);

// 获取单个产品的详细信息
router.get('/:productId', productController.getProductDetails);

// 创建新产品
router.post('/', productController.createProduct);

// 更新产品信息
router.put('/:productId', productController.updateProduct);

// 删除产品
router.delete('/:productId', productController.deleteProduct);

module.exports = router;

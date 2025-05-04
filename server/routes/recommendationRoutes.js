const express = require('express');
const router = express.Router();
const recommendationController = require('../controllers/recommendationController');
const { verifyToken } = require('../controllers/userController');

// 获取用户推荐
router.get('/user/:userId', verifyToken(), recommendationController.getUserRecommendations);

// 获取自己的推荐（需要认证）
router.get('/mine', verifyToken(), recommendationController.getUserRecommendations);

// 生成用户推荐（管理员或销售专用）
router.post('/generate/:userId', verifyToken('admin'), recommendationController.generateRecommendations);

// 获取相似商品
router.get('/similar/:productId', recommendationController.getSimilarProducts);

// 获取热门推荐
router.get('/popular', recommendationController.getPopularRecommendations);

module.exports = router;
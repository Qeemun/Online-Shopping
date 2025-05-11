'use strict';

const express = require('express');
const router = express.Router();
const db = require('../models');
const { authenticate, isAdmin } = require('../config/middleware/auth');

/**
 * 获取所有类别
 * GET /api/categories
 */
router.get('/', async (req, res) => {
  try {
    const categories = await db.Category.findAll({
      order: [['name', 'ASC']]
    });
    
    res.status(200).json({
      success: true,
      categories
    });
  } catch (error) {
    console.error('获取类别失败:', error);
    res.status(500).json({
      success: false,
      message: '获取类别失败',
      error: error.message
    });
  }
});

/**
 * 根据ID获取类别
 * GET /api/categories/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const category = await db.Category.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '类别不存在'
      });
    }
    
    res.status(200).json({
      success: true,
      category
    });
  } catch (error) {
    console.error('获取类别详情失败:', error);
    res.status(500).json({
      success: false,
      message: '获取类别详情失败',
      error: error.message
    });
  }
});

/**
 * 创建新类别（管理员限定）
 * POST /api/categories
 */
router.post('/', authenticate, isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: '类别名称不能为空'
      });
    }
    
    // 检查是否已存在同名类别
    const existingCategory = await db.Category.findOne({
      where: { name }
    });
    
    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: '类别名称已存在'
      });
    }
    
    const category = await db.Category.create({ name });
    
    res.status(201).json({
      success: true,
      message: '类别创建成功',
      category
    });
  } catch (error) {
    console.error('创建类别失败:', error);
    res.status(500).json({
      success: false,
      message: '创建类别失败',
      error: error.message
    });
  }
});

/**
 * 更新类别（管理员限定）
 * PUT /api/categories/:id
 */
router.put('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({
        success: false,
        message: '类别名称不能为空'
      });
    }
    
    const category = await db.Category.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '类别不存在'
      });
    }
    
    // 检查是否已存在同名类别
    const existingCategory = await db.Category.findOne({
      where: { name }
    });
    
    if (existingCategory && existingCategory.id !== parseInt(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: '类别名称已存在'
      });
    }
    
    await category.update({ name });
    
    res.status(200).json({
      success: true,
      message: '类别更新成功',
      category
    });
  } catch (error) {
    console.error('更新类别失败:', error);
    res.status(500).json({
      success: false,
      message: '更新类别失败',
      error: error.message
    });
  }
});

/**
 * 删除类别（管理员限定）
 * DELETE /api/categories/:id
 */
router.delete('/:id', authenticate, isAdmin, async (req, res) => {
  try {
    const category = await db.Category.findByPk(req.params.id);
    
    if (!category) {
      return res.status(404).json({
        success: false,
        message: '类别不存在'
      });
    }
    
    // 检查是否有关联的产品
    const products = await db.Product.findAll({
      where: { category: category.name }
    });
    
    if (products.length > 0) {
      return res.status(400).json({
        success: false,
        message: `无法删除类别，有 ${products.length} 个产品关联此类别`
      });
    }
    
    await category.destroy();
    
    res.status(200).json({
      success: true,
      message: '类别删除成功'
    });
  } catch (error) {
    console.error('删除类别失败:', error);
    res.status(500).json({
      success: false,
      message: '删除类别失败',
      error: error.message
    });
  }
});

module.exports = router;

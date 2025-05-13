/**
 * 此脚本用于确保所有需要的类别都存在于数据库中
 * 运行方式: node ensureCategories.js
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const db = require('../server/models');
const { Category } = db;

// 添加日志函数
function log(message, isError = false) {
  const timestamp = new Date().toISOString();
  const prefix = isError ? '❌ ERROR' : '✅ INFO';
  console.log(`[${timestamp}] ${prefix}: ${message}`);
}

// 我们希望确保存在的所有类别
const requiredCategories = [
  '电子产品', '服装', '家居', '厨房用品', '图书',
  '玩具', '运动器材', '美妆', '食品', '办公用品',
  '户外装备', '健康保健', '母婴产品', '宠物用品', '汽车配件'
];

(async () => {
  try {
    log('正在连接数据库...');
    await db.sequelize.authenticate();
    log('数据库连接成功');

    // 获取当前数据库中的类别
    const existingCategories = await Category.findAll();
    const existingNames = existingCategories.map(c => c.name);
    
    log(`数据库中已有类别: ${existingNames.join(', ')}`);
    
    // 找出缺少的类别
    const missingCategories = requiredCategories.filter(
      cat => !existingNames.includes(cat)
    );
    
    if (missingCategories.length === 0) {
      log('所有需要的类别已存在，无需添加');
    } else {
      log(`发现 ${missingCategories.length} 个缺少的类别: ${missingCategories.join(', ')}`);
      
      // 准备新类别数据
      const categoriesToAdd = missingCategories.map(name => ({
        name,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      
      // 添加到数据库
      const addedCategories = await Category.bulkCreate(categoriesToAdd);
      log(`成功添加 ${addedCategories.length} 个类别`);
      
      // 验证所有类别现在都存在
      const updatedCategories = await Category.findAll();
      log(`数据库现有 ${updatedCategories.length} 个类别`);
    }
  } catch (err) {
    log(`操作失败: ${err.message}`, true);
    console.error(err.stack);
  } finally {
    try {
      await db.sequelize.close();
      log('数据库连接已关闭');
    } catch (err) {
      log(`关闭连接出错: ${err.message}`, true);
    }
    process.exit(0);
  }
})();

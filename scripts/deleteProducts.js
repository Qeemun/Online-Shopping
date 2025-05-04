const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const db = require('../server/models');
const { Product } = db;

(async () => {
  try {
    console.log('正在连接数据库...');
    await db.sequelize.authenticate();
    console.log('数据库连接成功');

    // 删除所有商品记录（安全方式，避免外键冲突）
    const deletedCount = await Product.destroy({ where: {} });

    console.log(`成功删除 ${deletedCount} 条商品记录`);
  } catch (err) {
    console.error('删除失败:', err.message);
    console.error(err.stack);
  } finally {
    try {
      await db.sequelize.close();
      console.log('数据库连接已关闭');
    } catch (err) {
      console.error('关闭连接出错:', err.message);
    }
    process.exit(0);
  }
})();

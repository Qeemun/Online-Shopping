/**
 * Content-Type中间件
 * 确保所有API路由都返回JSON格式的数据
 */
module.exports = (req, res, next) => {
    // 设置响应的Content-Type为application/json
    res.setHeader('Content-Type', 'application/json');
    next();
};

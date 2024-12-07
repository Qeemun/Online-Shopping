const jwt = require('jsonwebtoken');
const User = require('../../models/user'); 

module.exports = async (req, res, next) => {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: '未授权' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // 通过 JWT 验证用户
        req.user = await User.findByPk(decoded.id); // 从数据库获取用户信息
        req.role = decoded.role; // 存储用户角色
        next();
    } catch (error) {
        res.status(401).json({ message: '无效的认证令牌' });
    }
};
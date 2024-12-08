const jwt = require('jsonwebtoken');
const db = require('../../models'); 
const User = db.User;       

module.exports = async (req, res, next) => {
    try {
        const authHeader = req.header('Authorization');
        if (!authHeader) {
            return res.status(401).json({ message: '未提供认证令牌' });
        }

        const token = authHeader.replace('Bearer ', '').trim();
        if (!token) {
            return res.status(401).json({ message: '无效的认证令牌' });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
            console.log('解码的token:', decoded); // 调试日志
        } catch (error) {
            console.error('Token验证失败:', error);
            return res.status(401).json({ message: 'Token验证失败' });
        }

        if (!decoded.userId) {
            console.error('Token中没有用户ID');
            return res.status(401).json({ message: 'Token无效' });
        }

        const user = await User.findByPk(decoded.userId); // 使用 userId
        if (!user) {
            console.error('未找到用户:', decoded.userId);
            return res.status(401).json({ message: '用户不存在' });
        }

        req.user = user;
        req.token = token;
        next();
    } catch (error) {
        console.error('认证错误:', error);
        res.status(401).json({ 
            message: '认证失败',
            error: error.message
        });
    }
};
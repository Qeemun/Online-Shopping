const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/user');

// 用户注册
exports.register = async (req, res) => {
    try {
        const { username, email, password } = req.body;

        // 检查用户名和邮箱是否已经存在
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false,message: '该邮箱已被使用' });
        }

        const newUser = await User.create({ username, email, password });
        res.status(201).json({ success: true,message: '注册成功' });
    } catch (error) {
        res.status(500).json({ success: false,message: '注册用户时出错' });
    }
};

// 用户登录
exports.login = async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "邮箱和密码不能为空" });
    }

    try {
        // 查找用户
        const user = await User.findOne({ where: { email } });

        if (!user) {
            return res.status(400).json({ success: false, message: "用户不存在" });
        }

        // 比对密码
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "密码错误" });
        }

        // 生成 JWT
        const token = jwt.sign({ userId: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '1h' });

        // 返回 token 和用户信息
        res.json({
            success: true,
            message: '登录成功',
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error("登录时出错:", error);
        res.status(500).json({ success: false, message: "服务器错误" });
    }
};


exports.verifyToken = (requiredRole) => {
    return (req, res, next) => {
        const token = req.headers['authorization']?.split(' ')[1]; // 获取 Authorization 头中的 token

        if (!token) {
            return res.status(403).json({ success: false,message: '未提供token' });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {  // 使用环境变量中的 JWT 密钥
            if (err) {
                return res.status(401).json({ success: false,message: '未授权' });
            }

            req.userId = decoded.userId; // 将用户 ID 存入请求中，供后续操作使用
            req.role = decoded.role;  // 将用户角色存入请求中

            // 检查用户角色是否符合要求
            if (requiredRole && req.role !== requiredRole) {
                return res.status(403).json({ success: false,message: '权限不足' });
            }

            next();
        });
    };
};

// 获取当前用户信息
exports.getUserProfile = async (req, res) => {
    try {
        const userId = req.userId;  // 从 JWT 中获取用户 ID
        const user = await User.findByPk(userId);  // 根据 ID 查找用户

        if (!user) {
            return res.status(404).json({ success: false,message: '用户未找到' });
        }

        // 返回用户信息（你可以根据需要选择返回哪些字段）
        res.json({
            username: user.username,
            email: user.email,
            role: user.role
        });
    } catch (error) {
        res.status(500).json({ success: false,message: '获取用户资料时出错' });
    }
};


// 用户注销
exports.logout = (req, res) => {
    // 客户端可以通过删除或禁用 token 来实现注销
    res.json({ success: true,message: '注销成功' });
};

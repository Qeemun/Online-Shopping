const nodemailer = require('nodemailer');
const Order = require('../models/order');  // 订单模型，假设你已经创建了订单模型
const User = require('../models/user');  // 用户模型，假设你已经创建了用户模型

// 模拟支付成功并发送发货确认邮件
exports.processPayment = async (req, res) => {
    const { orderId } = req.body;  // 从请求体中获取订单 ID

    try {
        // 假设我们已经有一个订单对象
        const order = await Order.findByPk(orderId);

        if (!order) {
            return res.status(404).json({ message: '订单未找到' });
        }

        // 更新订单状态为已支付
        order.status = 'Paid';
        await order.save();

        // 获取用户信息
        const user = await User.findByPk(order.userId);

        // 发送电子邮件通知发货
        sendOrderConfirmationEmail(user.email, order);

        res.status(200).json({ message: '支付成功，订单已确认并发货' });

    } catch (error) {
        console.error(error);
        res.status(500).json({ message: '支付处理失败', error: error.message });
    }
};

// 发送电子邮件确认发货
const sendOrderConfirmationEmail = async (email, order) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',  // 可以选择其他邮件服务
        auth: {
            user: process.env.EMAIL_USER,  // 使用环境变量存储邮件用户
            pass: process.env.EMAIL_PASS   // 使用环境变量存储邮件密码
        }
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: email,
        subject: '订单确认 - 已发货',
        text: `尊敬的用户，您的订单 ${order.id} 已成功支付并已发货。感谢您的购买！`
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log('发货确认邮件已发送');
    } catch (error) {
        console.error('发送邮件失败', error);
    }
};

const db = require('../models');
const Order = db.Order;
const User = db.User;
const OrderItem = db.OrderItem; 
const Product = db.Product;   
const nodemailer = require('nodemailer');

// 发送电子邮件确认发货
const sendOrderConfirmationEmail = async (email, order) => {
    try {
        // 使用 QQ 邮箱 SMTP
        const transporter = nodemailer.createTransport({
            host: 'smtp.qq.com',
            port: 465,
            secure: true, // 使用 SSL
            auth: {
                user: process.env.EMAIL_USER, // QQ 邮箱账号
                pass: process.env.EMAIL_APP_PASSWORD // QQ 邮箱授权码
            },
            connectionTimeout: 10000, // 10秒连接超时
            greetingTimeout: 5000,
            socketTimeout: 10000
        });

        const mailOptions = {
            from: `"在线商店" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '订单确认 - 已支付',
            html: `
                <h2>订单支付成功通知</h2>
                <p>尊敬的用户：</p>
                <p>您的订单 #${order.id} 已成功支付。</p>
                <p>订单金额：¥${order.total_amount}</p>
                <p>支付时间：${new Date().toLocaleString()}</p>
                <p>感谢您的购买！</p>
            `
        };

        // 验证邮件发送配置
        await transporter.verify();
        
        await transporter.sendMail(mailOptions);
        console.log('支付确认邮件已发送至:', email);
        return true;
    } catch (error) {
        console.error('发送邮件失败:', error);
        return false;
    }
};

// 支付处理函数，添加邮件发送错误处理
exports.processPayment = async (req, res) => {
    const { orderId } = req.body;

    try {
        // 获取订单和相关信息
        const order = await Order.findOne({
            where: { id: orderId },
            include: [{
                model: OrderItem,
                as: 'orderItems',
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'stock']
                }]
            },
            {
                model: User, // 加载用户信息
                as: 'user',
                attributes: ['email'] // 只加载用户的邮箱
            }]
        });

        if (!order) {
            return res.status(404).json({ 
                success: false,
                message: '订单未找到' 
            });
        }

        // 检查库存是否足够
        for (const orderItem of order.orderItems) {
            if (orderItem.product.stock < orderItem.quantity) {
                return res.status(400).json({ 
                    success: false,
                    message: `商品 ${orderItem.product.id} 的库存不足`
                });
            }
        }

        // 扣减库存
        for (const orderItem of order.orderItems) {
            const product = orderItem.product;
            product.stock -= orderItem.quantity;
            await product.save();
        }

        // 更新订单状态为已支付
        order.status = '已支付';
        await order.save();

        // 尝试发送支付确认邮件
        if (order.user && order.user.email) {
            try {
                await sendOrderConfirmationEmail(order.user.email, order);
                console.log(`支付确认邮件已发送至 ${order.user.email}`);
            } catch (emailError) {
                console.error('邮件发送失败，但支付流程已完成:', emailError);
            }
        } else {
            console.warn('未找到订单用户的邮箱地址，无法发送确认邮件');
        }

        res.status(200).json({ 
            success: true,
            message: '支付成功，订单已确认并扣减库存'
        });

    } catch (error) {
        console.error('支付处理失败:', error);
        res.status(500).json({ 
            success: false,
            message: '支付处理失败',
            error: error.message 
        });
    }
};

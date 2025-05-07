const db = require('../models');
const Order = db.Order;
const User = db.User;
const OrderItem = db.OrderItem; 
const Product = db.Product;   
const nodemailer = require('nodemailer');

// 发送电子邮件确认发货
const sendOrderConfirmationEmail = async (email, order) => {
    try {
        // 检查是否配置了邮件凭证
        if (!process.env.EMAIL_USER || !process.env.EMAIL_APP_PASSWORD) {
            console.log('邮件发送凭证未配置，跳过邮件发送');
            return false;
        }

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

        // 生成商品列表HTML
        let productsHTML = `
            <table style="width:100%; border-collapse: collapse; margin-top: 20px; margin-bottom: 20px;">
                <tr style="background-color: #f8f8f8;">
                    <th style="padding: 10px; text-align: left; border: 1px solid #ddd;">商品名称</th>
                    <th style="padding: 10px; text-align: center; border: 1px solid #ddd;">数量</th>
                    <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">单价</th>
                    <th style="padding: 10px; text-align: right; border: 1px solid #ddd;">总价</th>
                </tr>
        `;

        // 添加每个商品的信息
        for (const item of order.orderItems) {
            // 确保 price 是数字类型
            const price = parseFloat(item.price);
            const quantity = parseInt(item.quantity);
            const totalPrice = price * quantity;
            
            productsHTML += `
                <tr>
                    <td style="padding: 10px; text-align: left; border: 1px solid #ddd;">${item.product.name}</td>
                    <td style="padding: 10px; text-align: center; border: 1px solid #ddd;">${quantity}</td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">¥${price.toFixed(2)}</td>
                    <td style="padding: 10px; text-align: right; border: 1px solid #ddd;">¥${totalPrice.toFixed(2)}</td>
                </tr>
            `;
        }

        productsHTML += '</table>';

        const mailOptions = {
            from: `"在线商店" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: '订单确认 - 已支付',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                    <h2 style="color: #333; border-bottom: 2px solid #f0f0f0; padding-bottom: 10px;">订单支付成功通知</h2>
                    
                    <div style="margin: 20px 0;">
                        <h3 style="color: #333; margin-bottom: 15px;">订单信息</h3>
                        <p><strong>订单编号:</strong> #${order.id}</p>
                        <p><strong>总金额:</strong> ¥${parseFloat(order.totalAmount).toFixed(2)} 元</p>
                        <p><strong>订单状态:</strong> 已支付</p>
                        <p><strong>支付时间:</strong> ${new Date().toLocaleString()}</p>
                    </div>
                    
                    <div>
                        <h3 style="color: #333; margin-bottom: 15px;">商品列表</h3>
                        ${productsHTML}
                    </div>
                    
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #777; font-size: 14px;">
                        <p>感谢您的购买！如有任何问题，请随时与我们联系。</p>
                    </div>
                </div>
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
    const { orderId, address, contactName, contactPhone, note } = req.body;

    if (!orderId) {
        return res.status(400).json({
            success: false,
            message: '订单ID不能为空'
        });
    }

    try {
        // 获取订单和相关信息，确保包含了完整的商品数据
        const order = await Order.findOne({
            where: { id: orderId },
            include: [{
                model: OrderItem,
                as: 'orderItems',
                include: [{
                    model: Product,
                    as: 'product',
                    attributes: ['id', 'name', 'price', 'stock'] // 确保包含商品名称
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

        // 更新订单状态为已支付以及收货信息（使用驼峰命名法）
        order.status = 'paid';
        if (address) order.shippingAddress = address;
        if (contactName) order.recipientName = contactName;
        if (contactPhone) order.recipientPhone = contactPhone;
        if (note) order.note = note;
        
        await order.save();

        // 尝试发送支付确认邮件，但不影响支付流程
        let emailSent = false;
        if (order.user && order.user.email) {
            try {
                emailSent = await sendOrderConfirmationEmail(order.user.email, order);
                if (emailSent) {
                    console.log(`支付确认邮件已发送至 ${order.user.email}`);
                } else {
                    console.log(`邮件发送跳过或失败，但支付流程已完成`);
                }
            } catch (emailError) {
                console.error('邮件发送失败，但支付流程已完成:', emailError);
            }
        } else {
            console.warn('未找到订单用户的邮箱地址，无法发送确认邮件');
        }

        res.status(200).json({ 
            success: true,
            message: '支付成功，订单已确认并扣减库存',
            emailSent: emailSent
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

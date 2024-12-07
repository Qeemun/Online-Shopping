const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user');

class Order extends Model {}

Order.init({
    user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    total_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: '待支付',  // 初始状态为 '待支付'
        validate: {
            isIn: [['待支付', '已支付', '已发货', '已完成']]
        }
    },
    order_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'Order',
    timestamps: true,
});

Order.belongsTo(User, { foreignKey: 'user_id' });

module.exports = Order;

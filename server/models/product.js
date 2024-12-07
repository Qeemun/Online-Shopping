const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');

class Product extends Model {}

Product.init({
    name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: false
    },
    price: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        validate: {
            isDecimal: true,  // 确保价格是一个有效的小数
            min: 0  // 价格不能为负
        }
    },
    stock: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        validate: {
            min: 0  // 库存不能为负
        }
    },
    imageUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: 'https://www.apple.com.cn/iphone-16-pro/'  // 设置默认占位图
    }
}, {
    sequelize,
    modelName: 'Product',
    timestamps: true
});

module.exports = Product;

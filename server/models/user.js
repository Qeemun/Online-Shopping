const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const bcrypt = require('bcryptjs');

class User extends Model {}

User.init({
    username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    role: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'customer', // 默认角色为顾客
        validate: {
            isIn: [['customer', 'sales']] // 角色只能是 customer 或 sales
        }
    }
}, {
    sequelize,
    modelName: 'User',
    timestamps: true,
    hooks: {
        // 在创建和更新用户之前加密密码
        beforeSave: async (user) => {   // 使用 beforeSave 钩子，处理更新时的密码加密
            if (user.password && user.changed('password')) {  // 确保密码发生变化时才加密
                const salt = await bcrypt.genSalt(10);
                user.password = await bcrypt.hash(user.password, salt);
            }
        }
    }
});

module.exports = User;
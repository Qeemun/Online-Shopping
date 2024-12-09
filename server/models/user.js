const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
    class User extends Model {
        // 添加权限检查方法
        isCustomer() {
            return this.role === 'customer';
        }

        isSales() {
            return this.role === 'sales';
        }

        static associate(models) {
            User.hasMany(models.CartItem, {
                foreignKey: 'user_id',
                as: 'cartItems'
            });
            User.hasMany(models.Order, {
                foreignKey: 'user_id',
                as: 'orders'
            });
            User.hasMany(models.CustomerLog, {
                foreignKey: 'user_id',
                as: 'logs'
            });
        }
    }

    User.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        username: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                notEmpty: true,
                len: [2, 50]
            }
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                len: [6, 100]
            }
        },
        role: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'customer',
            validate: {
                isIn: [['customer', 'sales']]
            }
        }
    }, {
        sequelize,
        modelName: 'User',
        tableName: 'users',
        timestamps: true,
        hooks: {
            // 添加 beforeCreate 钩子来处理密码加密
            beforeCreate: async (user) => {
                if (user.password) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            },
            // 添加 beforeUpdate 钩子来处理密码更新
            beforeUpdate: async (user) => {
                if (user.changed('password')) {
                    const salt = await bcrypt.genSalt(10);
                    user.password = await bcrypt.hash(user.password, salt);
                }
            }
        }
    });

    User.prototype.validatePassword = async function(password) {
        return await bcrypt.compare(password, this.password);
    };

    return User;
};
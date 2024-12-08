const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class CustomerLog extends Model {
        static associate(models) {
            CustomerLog.belongsTo(models.User, {
                foreignKey: 'user_id',
                as: 'user'
            });
            CustomerLog.belongsTo(models.Product, {
                foreignKey: 'product_id',
                as: 'product'
            });
        }
    }

    CustomerLog.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'Users',
                key: 'id'
            }
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Products',
                key: 'id'
            }
        },
        action: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        ip_address: {
            type: DataTypes.STRING,
            allowNull: true
        },
        created_at: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        sequelize,
        modelName: 'CustomerLog',
        tableName: 'customer_logs',
        timestamps: true, // 改为 true，让 Sequelize 自动管理时间戳
        createdAt: 'created_at', // 指定创建时间字段名
        updatedAt: 'updated_at', // 指定更新时间字段名
        indexes: [
            {
                fields: ['user_id']
            },
            {
                fields: ['product_id']
            }
        ]
    });

    return CustomerLog;
};
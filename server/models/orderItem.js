const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class OrderItem extends Model {
        static associate(models) {
            OrderItem.belongsTo(models.Order, {
                foreignKey: 'orderId',
                as: 'order'
            });
            
            OrderItem.belongsTo(models.Product, {
                foreignKey: 'productId',
                as: 'product'
            });
        }
    }

    OrderItem.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        orderId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'orders',
                key: 'id'
            }
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'products',
                key: 'id'
            }
        },
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: 1
            }
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    }, {
        sequelize,
        modelName: 'OrderItem',
        tableName: 'orderItems',
        timestamps: true
    });

    return OrderItem;
};
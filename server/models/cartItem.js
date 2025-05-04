const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class CartItem extends Model {
        static associate(models) {
            CartItem.belongsTo(models.Product, {
                foreignKey: 'productId',
                as: 'product'
            });
            CartItem.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'user'
            });
        }
    }

    CartItem.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false,
            references: {
                model: 'users',
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
            defaultValue: 1,
            validate: {
                min: 1
            }
        },
        addedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
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
        modelName: 'CartItem',
        tableName: 'cartItems',
        timestamps: true,
        indexes: [
            {
                unique: true,
                fields: ['userId', 'productId']
            }
        ]
    });

    return CartItem;
};
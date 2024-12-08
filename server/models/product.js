const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class Product extends Model {
        static associate(models) {
            Product.hasMany(models.CartItem, {
                foreignKey: 'product_id',
                as: 'cartItems'
            });
        }
    }

    Product.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: true
            }
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false,
            validate: {
                min: 0
            }
        },
        imageUrl: {
            type: DataTypes.STRING,
            allowNull: true,
            field: 'image_url',
        },
        stock: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: 0
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'Product',
        tableName: 'products',
        timestamps: true,
        indexes: [
            {
                fields: ['name']
            }
        ]
    });

    return Product;
};
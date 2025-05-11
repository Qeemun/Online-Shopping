const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Product extends Model {    static associate(models) {
      Product.hasMany(models.CartItem, {
        foreignKey: 'productId',
        as: 'cartItems'
      });
      Product.hasMany(models.OrderItem, {
        foreignKey: 'productId',
        as: 'orderItems'
      });
      Product.hasMany(models.Recommendation, {
        foreignKey: 'productId',
        as: 'recommendations'
      });
      Product.hasMany(models.ProductViewLog, {
        foreignKey: 'productId',
        as: 'viewLogs'
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
      validate: { notEmpty: true }
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      validate: { min: 0 }
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: { min: 0 }
    },    category: {
      type: DataTypes.STRING,
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('active', 'discontinued'),
      allowNull: false,
      defaultValue: 'active'
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true
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
    modelName: 'Product',
    tableName: 'products',
    timestamps: true
  });

  return Product;
};

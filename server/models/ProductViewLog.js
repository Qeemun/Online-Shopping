'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ProductViewLog extends Model {
    static associate(models) {
      // 关联用户表
      ProductViewLog.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      
      // 关联产品表
      ProductViewLog.belongsTo(models.Product, {
        foreignKey: 'productId',
        as: 'product'
      });
    }
  }
  
  ProductViewLog.init({
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
    durationSeconds: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    timestamp: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'ProductViewLog',
    timestamps: true
  });
  
  return ProductViewLog;
};

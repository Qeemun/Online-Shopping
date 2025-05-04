const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Order extends Model {
    static associate(models) {
      Order.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      Order.hasMany(models.OrderItem, {
        foreignKey: 'orderId',
        as: 'orderItems'
      });
    }
  }

  Order.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: 'users', key: 'id' }
    },
    totalAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('pending', 'paid', 'shipped', 'completed', 'cancelled'),
      allowNull: false,
      defaultValue: 'pending'
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
    modelName: 'Order',
    tableName: 'orders',
    timestamps: true
  });

  return Order;
};

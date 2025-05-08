const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class SalesProductAssignment extends Model {
    static associate(models) {
      // 定义与User模型的关联
      SalesProductAssignment.belongsTo(models.User, {
        foreignKey: 'salesId',
        as: 'salesStaff'
      });
      
      // 定义与Product模型的关联
      SalesProductAssignment.belongsTo(models.Product, {
        foreignKey: 'productId',
        as: 'product'
      });
    }
  }

  SalesProductAssignment.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    salesId: {
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
    modelName: 'SalesProductAssignment',
    tableName: 'salesproductassignments', // 根据截图中的表名设置
    timestamps: true // 启用时间戳
  });

  return SalesProductAssignment;
};
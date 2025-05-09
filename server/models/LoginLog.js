'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class LoginLog extends Model {
    static associate(models) {
      // 关联用户表
      LoginLog.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    }
  }
  
  LoginLog.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    role: {
      type: DataTypes.ENUM('customer', 'sales', 'admin'),
      allowNull: false
    },
    action: {
      type: DataTypes.ENUM('login', 'logout'),
      allowNull: false
    },
    ipAddress: {
      type: DataTypes.STRING,
      allowNull: false
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    userAgent: {
      type: DataTypes.STRING,
      allowNull: true
    },
    sessionId: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'LoginLog',
    // 删除自定义表名，使用Sequelize默认的驼峰命名规则
    timestamps: true
  });
  
  return LoginLog;
};
const { Model, DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const User = require('./user');
const Product = require('./product');

class CustomerLog extends Model {}

CustomerLog.init({
    action: {
        type: DataTypes.STRING,
        allowNull: false
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    sequelize,
    modelName: 'CustomerLog',
    timestamps: false
});

CustomerLog.belongsTo(User, { foreignKey: 'customerId' });
CustomerLog.belongsTo(Product, { foreignKey: 'productId' });

module.exports = CustomerLog;

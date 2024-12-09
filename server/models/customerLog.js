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
            allowNull: false
        },
        product_id: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        action: {
            type: DataTypes.STRING,
            allowNull: false
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true
        },
        ip_address: {
            type: DataTypes.STRING,
            allowNull: true
        }
    }, {
        sequelize,
        modelName: 'CustomerLog',
        tableName: 'customer_logs',
        timestamps: false
    });

    return CustomerLog;
};
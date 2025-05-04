const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class UserActivityLog extends Model {
        static associate(models) {
            UserActivityLog.belongsTo(models.User, { 
                foreignKey: 'userId' 
            });
            UserActivityLog.belongsTo(models.Product, { 
                foreignKey: 'productId' 
            });
        }
    }

    UserActivityLog.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        productId: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        action: {
            type: DataTypes.ENUM('view', 'purchase', 'stay'),
            allowNull: false
        },
        durationSeconds: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        ipAddress: {
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
        modelName: 'UserActivityLog',
        tableName: 'userActivityLogs',
        timestamps: true
    });

    return UserActivityLog;
};

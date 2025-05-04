const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class AdminActionLog extends Model {
        static associate(models) {
            // 可以添加与User的关联，但需要基于accountId字段
        }
    }

    AdminActionLog.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        accountId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('admin', 'sales'),
            allowNull: false
        },
        action: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        path: {
            type: DataTypes.STRING,
            allowNull: true
        },
        method: {
            type: DataTypes.STRING,
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
        modelName: 'AdminActionLog',
        tableName: 'adminActionLogs',
        timestamps: true
    });

    return AdminActionLog;
};

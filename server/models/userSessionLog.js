const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class UserSessionLog extends Model {
        static associate(models) {
            UserSessionLog.belongsTo(models.User, { 
                foreignKey: 'userId' 
            });
        }
    }

    UserSessionLog.init({
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        userId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        action: {
            type: DataTypes.ENUM('login', 'logout'),
            allowNull: false
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
        modelName: 'UserSessionLog',
        tableName: 'userSessionLogs',
        timestamps: true
    });

    return UserSessionLog;
};

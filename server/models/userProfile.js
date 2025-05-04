const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class UserProfile extends Model {
        static associate(models) {
            UserProfile.belongsTo(models.User, { 
                foreignKey: 'userId' 
            });
        }
    }

    UserProfile.init({
        userId: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        region: {
            type: DataTypes.STRING,
            allowNull: true
        },
        totalSpent: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        favoriteCategory: {
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
        modelName: 'UserProfile',
        tableName: 'userProfiles',
        timestamps: true
    });

    return UserProfile;
};

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    class Recommendation extends Model {
        static associate(models) {
            Recommendation.belongsTo(models.User, { 
                foreignKey: 'userId' 
            });
            Recommendation.belongsTo(models.Product, { 
                foreignKey: 'productId' 
            });
        }
    }

    Recommendation.init({
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
            allowNull: false
        },
        score: {
            type: DataTypes.DECIMAL(5, 2),
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
        modelName: 'Recommendation',
        tableName: 'recommendations',
        timestamps: true
    });

    return Recommendation;
};

const { Model, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

module.exports = (sequelize) => {
  class User extends Model {
    isCustomer() {
      return this.role === 'customer';
    }
    isSales() {
      return this.role === 'sales';
    }
    isAdmin() {
      return this.role === 'admin';
    }    static associate(models) {
      User.hasMany(models.CartItem, { foreignKey: 'userId', as: 'cartItems' });
      User.hasMany(models.Order, { foreignKey: 'userId', as: 'orders' });
      User.hasOne(models.UserProfile, { foreignKey: 'userId', as: 'profile' });
      User.hasMany(models.Recommendation, { foreignKey: 'userId' });
      User.hasMany(models.ProductViewLog, { foreignKey: 'userId', as: 'productViewLogs' });
    }
  }
  User.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { notEmpty: true, len: [2, 100] }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { isEmail: true }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: { len: [6, 255] }
    },
    role: {
      type: DataTypes.ENUM('customer', 'sales', 'admin'),
      allowNull: false,
      defaultValue: 'customer'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true
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
    modelName: 'User',
    tableName: 'users',
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });

  User.prototype.validatePassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };

  return User;
};

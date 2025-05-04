const { Sequelize } = require('sequelize');
require('dotenv').config();
const config = require('./config.json');
const environment = process.env.NODE_ENV || 'development';
const envConfig = config[environment];

// 打印数据库连接配置，确保配置正确
console.log('Using database configuration:', envConfig);

// 直接使用 config.json 中的配置
const sequelize = new Sequelize(
  envConfig.database,
  envConfig.username,
  envConfig.password,
  {
    host: envConfig.host,
    dialect: envConfig.dialect,
    logging: false,
    dialectOptions: {
      ssl: {
        rejectUnauthorized: false
      },
    },
  }
);

module.exports = sequelize;


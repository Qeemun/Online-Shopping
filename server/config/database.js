const { Sequelize } = require('sequelize');
require('dotenv').config();
const config = require('./config.json');  // 引入配置文件
const environment = process.env.NODE_ENV || 'development';  // 获取当前环境，默认为 development
const envConfig = config[environment];  // 获取当前环境的配置

// 打印数据库连接配置，确保配置正确
console.log('Using database configuration:', envConfig);
console.log('DATABASE_URL:', process.env.DATABASE_URL);

// 连接到 MySQL 数据库
const sequelize = new Sequelize(process.env[envConfig.use_env_variable], {  // 使用 DATABASE_URL
    dialect: envConfig.dialect,
    logging: false,  // 如果不需要打印查询日志，可以设置为 false
    dialectOptions: {
        ssl: {
            rejectUnauthorized: false  // 禁用 SSL 验证
        },
    },
});

module.exports = sequelize;


const { Sequelize } = require('sequelize');
require('dotenv').config();

// 資料庫連接設定
const sequelize = new Sequelize({
  database: process.env.DB_NAME || 'digital_business_cards',
  username: process.env.DB_USER || 'app_user',
  password: process.env.DB_PASSWORD || 'secure_password_2024',
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  dialect: 'postgres',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  
  // 連接池設定
  pool: {
    max: 20,
    min: 0,
    acquire: 60000,
    idle: 10000
  },
  
  // 其他設定
  define: {
    timestamps: true,
    underscored: false,
    freezeTableName: true,
    charset: 'utf8',
    dialectOptions: {
      collate: 'utf8_general_ci'
    }
  },
  
  // 連接選項
  dialectOptions: {
    connectTimeout: 60000,
    acquireTimeout: 60000,
    timeout: 60000,
  },
  
  // 重試設定
  retry: {
    max: 3
  }
});

// 載入模型
const User = require('../models/User')(sequelize);
const SystemSetting = require('../models/SystemSetting')(sequelize);

// 建立關聯 (如果需要)
// User.hasMany(SomeOtherModel);
// SomeOtherModel.belongsTo(User);

// 測試連接
const testConnection = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection has been established successfully.');
  } catch (error) {
    console.error('❌ Unable to connect to the database:', error);
    throw error;
  }
};

// 初始化資料庫
const initializeDatabase = async () => {
  try {
    await testConnection();
    
    // 在開發環境中同步模型
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      console.log('✅ All models were synchronized successfully.');
    }
  } catch (error) {
    console.error('❌ Failed to initialize database:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  User,
  SystemSetting,
  testConnection,
  initializeDatabase
};
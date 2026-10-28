require('dotenv').config({ path: require('path').resolve(__dirname, '../.env'), quiet: true })
const { Sequelize } = require('sequelize')
const options = { dialect: 'mysql', logging: false, timezone: '+00:00', pool: { max: 10, min: 0, acquire: 30000, idle: 10000 },
    ...(process.env.DB_SSL === 'true' ? { dialectOptions: { ssl: { rejectUnauthorized: true } } } : {}) }
const url = process.env.MYSQL_URL || process.env.DATABASE_URL
const db = url ? new Sequelize(url, options) : new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASS, {
    ...options, host: process.env.DB_HOST || 'localhost', port: Number(process.env.DB_PORT) || 3306
})
module.exports = db

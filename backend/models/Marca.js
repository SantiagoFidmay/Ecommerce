const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Marca = db.define('marca', {
    codMarca: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true
    },
    slug: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true
    },
    descricao: {
        type: DataTypes.TEXT
    },
    site_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    contato_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    ordem: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: false,
    tableName: 'marcas'
})

module.exports = Marca

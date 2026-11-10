const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Ficha = db.define('ficha', {
    idProduto: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    dados: {
        type: DataTypes.JSON,
        allowNull: false
    },
    atualizado_em: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: 'produto_fichas'
})

module.exports = Ficha

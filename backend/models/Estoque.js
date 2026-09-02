const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Estoque = db.define('estoque', {
    codEstoque: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idProduto: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: 'produtos',
            key: 'codProduto'
        }
    },
    quantidade: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    quantidade_minima: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 5
    },
    ultima_atualizacao: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: 'estoque'
})

module.exports = Estoque

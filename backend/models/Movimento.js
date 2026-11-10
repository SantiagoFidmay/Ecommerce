const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Movimento = db.define('movimento', {
    codMovimento: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idProduto: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    idVariante: {
        type: DataTypes.INTEGER
    },
    idPedido: {
        type: DataTypes.INTEGER
    },
    idUsuario: {
        type: DataTypes.INTEGER
    },
    tipo: {
        type: DataTypes.STRING(30),
        allowNull: false
    },
    quantidade: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    saldo: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    motivo: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    criado_em: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: 'movimentacoes_estoque'
})

module.exports = Movimento

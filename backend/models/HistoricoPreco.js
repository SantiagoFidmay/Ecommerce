const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const HistoricoPreco = db.define('historico_preco', {
    codHistorico: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idProduto: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    preco: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    criado_em: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: 'historico_precos'
})

module.exports = HistoricoPreco

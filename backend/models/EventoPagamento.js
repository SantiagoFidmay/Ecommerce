const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const EventoPagamento = db.define('evento_pagamento', {
    codEvento: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idPagamento: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    evento: {
        type: DataTypes.STRING(60),
        allowNull: false
    },
    referencia: {
        type: DataTypes.STRING(150),
        allowNull: true
    },
    criado_em: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: 'eventos_pagamento'
})

module.exports = EventoPagamento

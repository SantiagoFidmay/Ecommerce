const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Pedido = db.define('pedido', {
    codPedido: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idUsuario: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'usuarios',
            key: 'codUsuario'
        }
    },
    dataPedido: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    status: {
        type: DataTypes.ENUM('PENDENTE', 'CONFIRMADO', 'EM_SEPARACAO', 'ENVIADO', 'ENTREGUE', 'CANCELADO'),
        allowNull: false,
        defaultValue: 'PENDENTE'
    },
    forma_pagamento: {
        type: DataTypes.ENUM('CARTAO_CREDITO', 'CARTAO_DEBITO', 'PIX', 'BOLETO'),
        allowNull: true
    },
    valorSubtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    valorDesconto: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    valorFrete: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    valorTotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
    },
    observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: false,
    tableName: 'pedidos'
})

module.exports = Pedido

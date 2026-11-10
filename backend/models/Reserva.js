const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Reserva = db.define('reserva', {
    idPedido: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    expira_em: {
        type: DataTypes.DATE,
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('ATIVA', 'CONSUMIDA', 'LIBERADA'),
        defaultValue: 'ATIVA',
        allowNull: false
    }
}, {
    timestamps: false,
    tableName: 'reservas_pedido'
})

module.exports = Reserva

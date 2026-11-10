const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Seguranca = db.define('seguranca', {
    idUsuario: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true
    },
    revogar_legados: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timestamps: false,
    tableName: 'seguranca_conta'
})

module.exports = Seguranca

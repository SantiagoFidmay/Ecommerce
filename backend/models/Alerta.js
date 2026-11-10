const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Alerta = db.define('alerta', {
    codAlerta: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idUsuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    idVariante: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    },
    criado_em: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: 'alertas_disponibilidade',
    indexes: [{
        unique: true,
        fields: ['idUsuario', 'idVariante']
    }]
})

module.exports = Alerta

const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Rotacao = db.define('rotacao', {
    codRotacao: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idUsuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    idProduto: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    uso: {
        type: DataTypes.ENUM('DIARIO', 'VELOCIDADE', 'PROVA'),
        allowNull: false
    },
    criado_em: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: 'rotacao_tenis',
    indexes: [{
        unique: true,
        fields: ['idUsuario', 'idProduto']
    }]
})

module.exports = Rotacao

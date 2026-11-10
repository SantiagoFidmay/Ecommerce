const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Avaliacao = db.define('avaliacao', {
    codAvaliacao: {
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
    idPedido: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    nota: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    comentario: {
        type: DataTypes.STRING(1000),
        allowNull: false
    },
    ajuste: {
        type: DataTypes.ENUM('PEQUENO', 'ADEQUADO', 'GRANDE'),
        allowNull: false
    },
    uso: {
        type: DataTypes.STRING(80),
        allowNull: true
    },
    visivel: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    criado_em: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: 'avaliacoes',
    indexes: [{
        unique: true,
        fields: ['idUsuario', 'idProduto', 'idPedido']
    }]
})

module.exports = Avaliacao

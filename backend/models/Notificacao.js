const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Notificacao = db.define('notificacao', {
    codNotificacao: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idUsuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    titulo: {
        type: DataTypes.STRING(150),
        allowNull: false
    },
    mensagem: {
        type: DataTypes.STRING(1000),
        allowNull: false
    },
    idProduto: {
        type: DataTypes.INTEGER
    },
    lida: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    criado_em: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: 'notificacoes'
})

module.exports = Notificacao

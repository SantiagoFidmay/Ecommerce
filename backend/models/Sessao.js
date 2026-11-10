const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Sessao = db.define('sessao', {
    jti: {
        type: DataTypes.STRING(80),
        primaryKey: true
    },
    idUsuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    revogada: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    expira_em: {
        type: DataTypes.DATE,
        allowNull: false
    },
    criado_em: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: 'sessoes'
})

module.exports = Sessao

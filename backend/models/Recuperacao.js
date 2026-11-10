const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Recuperacao = db.define('recuperacao', {
    token_hash: {
        type: DataTypes.STRING(64),
        primaryKey: true
    },
    idUsuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    expira_em: {
        type: DataTypes.DATE,
        allowNull: false
    },
    usada: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timestamps: false,
    tableName: 'recuperacoes_senha'
})

module.exports = Recuperacao

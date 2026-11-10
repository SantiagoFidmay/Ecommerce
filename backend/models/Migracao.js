const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Migracao = db.define('migracao', {
    nome: {
        type: DataTypes.STRING(150),
        primaryKey: true
    },
    aplicado_em: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: 'schema_migrations'
})

module.exports = Migracao

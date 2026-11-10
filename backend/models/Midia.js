const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Midia = db.define('midia', {
    codMidia: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idProduto: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    tipo: {
        type: DataTypes.ENUM('IMAGEM', 'REVIEW'),
        allowNull: false
    },
    url: {
        type: DataTypes.STRING(500),
        allowNull: false
    },
    titulo: {
        type: DataTypes.STRING(150),
        allowNull: true
    },
    credito: {
        type: DataTypes.STRING(150),
        allowNull: true
    },
    ordem: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    }
}, {
    timestamps: false,
    tableName: 'produto_midias'
})

module.exports = Midia

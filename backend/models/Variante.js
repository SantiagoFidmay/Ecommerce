const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Variante = db.define('variante', {
    codVariante: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idProduto: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    sku: {
        type: DataTypes.STRING(80),
        allowNull: false,
        unique: true
    },
    tamanho: {
        type: DataTypes.STRING(20),
        allowNull: false
    },
    cor: {
        type: DataTypes.STRING(50),
        allowNull: false
    },
    quantidade: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0
    },
    quantidade_minima: {
        type: DataTypes.INTEGER,
        defaultValue: 2
    },
    ativo: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    legado: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    }
}, {
    timestamps: false,
    tableName: 'produto_variantes',
    indexes: [{
        unique: true,
        fields: ['idProduto', 'tamanho', 'cor']
    }]
})

module.exports = Variante

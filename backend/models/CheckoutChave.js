const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const CheckoutChave = db.define('checkout_chave', {
    codChave: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idUsuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    chave: {
        type: DataTypes.STRING(80),
        allowNull: false
    },
    resumo_hash: {
        type: DataTypes.STRING(64),
        allowNull: false
    },
    idPedido: {
        type: DataTypes.INTEGER
    },
    criado_em: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: 'checkout_chaves',
    indexes: [{
        unique: true,
        fields: ['idUsuario', 'chave']
    }]
})

module.exports = CheckoutChave

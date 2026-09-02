const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const ItemPedido = db.define('item_pedido', {
    codItemPedido: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idPedido: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'pedidos',
            key: 'codPedido'
        }
    },
    idProduto: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'produtos',
            key: 'codProduto'
        }
    },
    quantidade: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    preco_unitario: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    subtotal: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    tamanho: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    cor: {
        type: DataTypes.STRING(50),
        allowNull: true
    }
}, {
    timestamps: false,
    tableName: 'itens_pedido'
})

module.exports = ItemPedido

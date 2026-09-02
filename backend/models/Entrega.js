const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Entrega = db.define('entrega', {
    codEntrega: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idPedido: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
            model: 'pedidos',
            key: 'codPedido'
        }
    },
    status: {
        type: DataTypes.ENUM('PENDENTE', 'EM_TRANSITO', 'SAIU_PARA_ENTREGA', 'ENTREGUE', 'TENTATIVA_FALHA', 'DEVOLVIDO'),
        allowNull: false,
        defaultValue: 'PENDENTE'
    },
    codigo_rastreio: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    transportadora: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    endereco_entrega: {
        type: DataTypes.STRING(300),
        allowNull: false
    },
    cep_entrega: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    data_previsao: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    data_entrega: {
        type: DataTypes.DATEONLY,
        allowNull: true
    },
    observacoes: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    timestamps: false,
    tableName: 'entregas'
})

module.exports = Entrega

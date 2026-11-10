const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Pagamento = db.define('pagamento', {
    codPagamento: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idPedido: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true
    },
    provedor: {
        type: DataTypes.STRING(40),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('PENDENTE', 'APROVADO', 'RECUSADO', 'CANCELADO', 'REEMBOLSADO', 'REVISAO'),
        defaultValue: 'PENDENTE',
        allowNull: false
    },
    preferencia_id: {
        type: DataTypes.STRING(150),
        allowNull: true
    },
    pagamento_id: {
        type: DataTypes.STRING(150),
        allowNull: true,
        unique: true
    },
    checkout_url: {
        type: DataTypes.STRING(1000),
        allowNull: true
    },
    valor: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    atualizado_em: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: 'pagamentos'
})

module.exports = Pagamento

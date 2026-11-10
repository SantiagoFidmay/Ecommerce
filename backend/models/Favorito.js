const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Favorito = db.define('favorito', {
    codFavorito: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idUsuario: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    idProduto: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    criado_em: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    }
}, {
    timestamps: false,
    tableName: 'favoritos',
    indexes: [{
        unique: true,
        fields: ['idUsuario', 'idProduto']
    }]
})

module.exports = Favorito

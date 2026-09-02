const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Produto = db.define('produto', {
    codProduto: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    idCategoria: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'categorias',
            key: 'codCategoria'
        }
    },
    nome: {
        type: DataTypes.STRING(150),
        allowNull: false
    },
    descricao: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    preco: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false
    },
    preco_promocional: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true
    },
    imagem_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    video_url: {
        type: DataTypes.STRING(500),
        allowNull: true
    },
    tamanhos_disponiveis: {
        type: DataTypes.JSON,
        allowNull: true
    },
    cores: {
        type: DataTypes.JSON,
        allowNull: true
    },
    marca: {
        type: DataTypes.STRING(80),
        allowNull: true
    },
    codigo_produto: {
        type: DataTypes.STRING(50),
        allowNull: true,
        unique: true
    },
    destaque: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false
    },
    ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    timestamps: false,
    tableName: 'produtos'
})

module.exports = Produto

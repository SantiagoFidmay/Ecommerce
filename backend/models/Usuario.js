const { DataTypes } = require('sequelize')
const db = require('../db/conn')

const Usuario = db.define('usuario', {
    codUsuario: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    nome: {
        type: DataTypes.STRING(100),
        allowNull: false
    },
    email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true
    },
    cpf: {
        type: DataTypes.STRING(14),
        allowNull: false,
        unique: true
    },
    senha: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    telefone: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    tipo_usuario: {
        type: DataTypes.ENUM('CLIENTE', 'ADMIN'),
        allowNull: false,
        defaultValue: 'CLIENTE'
    },
    cep: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    rua: {
        type: DataTypes.STRING(200),
        allowNull: true
    },
    numero: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    complemento: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    bairro: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    cidade: {
        type: DataTypes.STRING(100),
        allowNull: true
    },
    estado: {
        type: DataTypes.STRING(2),
        allowNull: true
    },
    ativo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
    }
}, {
    timestamps: false,
    tableName: 'usuarios'
})

module.exports = Usuario

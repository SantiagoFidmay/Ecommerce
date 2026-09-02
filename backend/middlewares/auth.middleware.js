const jwt = require('jsonwebtoken')
const { Usuario } = require('../models/rel')

const autenticar = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ erro: 'Token de autenticação não fornecido.' })
        }

        const token   = authHeader.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET)

        const usuario = await Usuario.findByPk(decoded.id, {
            attributes: { exclude: ['senha'] }
        })

        if (!usuario || !usuario.ativo) {
            return res.status(401).json({ erro: 'Usuário não encontrado ou inativo.' })
        }

        req.usuario = usuario
        next()
    } catch (err) {
        if (err.name === 'JsonWebTokenError')  return res.status(401).json({ erro: 'Token inválido.' })
        if (err.name === 'TokenExpiredError')  return res.status(401).json({ erro: 'Token expirado. Faça login novamente.' })
        return res.status(500).json({ erro: 'Erro ao verificar autenticação.' })
    }
}

const apenasAdmin = (req, res, next) => {
    if (!req.usuario || req.usuario.tipo_usuario !== 'ADMIN') {
        return res.status(403).json({ erro: 'Acesso restrito a administradores.' })
    }
    next()
}

module.exports = { autenticar, apenasAdmin }

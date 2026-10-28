const jwt = require('jsonwebtoken')
const { Usuario, Sessao, Seguranca } = require('../models/rel')

const autenticar = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ erro: 'Token de autenticação não fornecido.' })
        }

        const token   = authHeader.split(' ')[1]
        const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] })
        if (decoded.jti) {
            const sessao = await Sessao.findByPk(decoded.jti)
            if (!sessao || sessao.revogada || sessao.idUsuario !== decoded.id || sessao.expira_em <= new Date()) return res.status(401).json({ erro: 'Sessão encerrada. Faça login novamente.' })
        } else {
            const seguranca = await Seguranca.findByPk(decoded.id)
            if (seguranca?.revogar_legados) return res.status(401).json({ erro: 'Sessão encerrada. Faça login novamente.' })
        }

        const usuario = await Usuario.findByPk(decoded.id, {
            attributes: { exclude: ['senha'] }
        })

        if (!usuario || !usuario.ativo) {
            return res.status(401).json({ erro: 'Usuário não encontrado ou inativo.' })
        }

        req.usuario = usuario
        req.sessaoJti = decoded.jti || null
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

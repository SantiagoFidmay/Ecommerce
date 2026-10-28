const crypto = require('node:crypto')
const jwt = require('jsonwebtoken')
const { Sessao, Seguranca } = require('../models/rel')

async function criarSessao(usuario) {
    const jti = crypto.randomUUID()
    const token = jwt.sign({ id: usuario.codUsuario, email: usuario.email, tipo: usuario.tipo_usuario }, process.env.JWT_SECRET,
        { jwtid: jti, expiresIn: process.env.JWT_EXPIRES_IN || '7d', algorithm: 'HS256' })
    const decoded = jwt.decode(token)
    await Sessao.create({ jti, idUsuario: usuario.codUsuario, expira_em: new Date(decoded.exp * 1000) })
    return token
}
async function revogarSessoes(idUsuario, transaction) {
    await Sessao.update({ revogada: true }, { where: { idUsuario }, transaction })
    await Seguranca.upsert({ idUsuario, revogar_legados: true }, { transaction })
}
module.exports = { criarSessao, revogarSessoes }

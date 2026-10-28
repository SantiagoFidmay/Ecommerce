const router = require('express').Router()
const crypto = require('node:crypto')
const bcrypt = require('bcryptjs')
const db = require('../db/conn')
const { Usuario, Sessao, Recuperacao } = require('../models/rel')
const { autenticar } = require('../middlewares/auth.middleware')
const { revogarSessoes } = require('../services/sessao.service')
const { handler, falhar } = require('../utils/api.util')
const mail = { async enviar(mensagem) {
    const transporter = require('nodemailer').createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT) || 587, secure: process.env.SMTP_SECURE === 'true', requireTLS: process.env.SMTP_SECURE !== 'true', auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } })
    await transporter.sendMail({ from: process.env.SMTP_FROM, ...mensagem })
} }
router.get('/configuracao', (req, res) => res.json({ recuperacao_disponivel: Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS && process.env.SMTP_FROM && process.env.FRONTEND_URL) }))
router.post('/logout', autenticar, handler(async (req, res) => {
    if (req.sessaoJti) await Sessao.update({ revogada: true }, { where: { jti: req.sessaoJti, idUsuario: req.usuario.codUsuario } })
    else await revogarSessoes(req.usuario.codUsuario)
    res.json({ encerrada: true })
}))
router.post('/recuperar', handler(async (req, res) => {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.SMTP_FROM || !process.env.FRONTEND_URL) falhar(503, 'A recuperação por e-mail ainda não foi configurada. Procure o responsável pela loja.')
    if (typeof req.body.email !== 'string' || req.body.email.length > 150) falhar(400, 'Informe um e-mail válido.')
    const usuario = await Usuario.findOne({ where: { email: req.body.email.trim().toLowerCase(), ativo: true } })
    if (usuario) {
        const token = crypto.randomBytes(32).toString('hex'), token_hash = crypto.createHash('sha256').update(token).digest('hex')
        await Recuperacao.create({ token_hash, idUsuario: usuario.codUsuario, expira_em: new Date(Date.now() + 20 * 60000) })
        const link = new URL('pages/recuperar.html', process.env.FRONTEND_URL.endsWith('/') ? process.env.FRONTEND_URL : process.env.FRONTEND_URL + '/')
        link.hash = token
        await mail.enviar({ to: usuario.email, subject: 'Redefinição de senha — Sport Kicks', text: `Você solicitou a redefinição de senha. Abra ${link.href} em até 20 minutos. Se não foi você, ignore esta mensagem.` })
    }
    res.json({ mensagem: 'Se houver uma conta com esse e-mail, enviaremos as instruções de recuperação.' })
}))
router.post('/redefinir', handler(async (req, res) => {
    const { token, senha } = req.body
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token) || typeof senha !== 'string' || senha.length < 8 || Buffer.byteLength(senha, 'utf8') > 72) falhar(400, 'Link inválido ou senha fora dos limites de 8 caracteres e 72 bytes.')
    const token_hash = crypto.createHash('sha256').update(token).digest('hex')
    const referencia = await Recuperacao.findByPk(token_hash)
    if (!referencia) falhar(400, 'Este link é inválido ou expirou.')
    await db.transaction(async transaction => {
        const usuario = await Usuario.findByPk(referencia.idUsuario, { transaction, lock: transaction.LOCK.UPDATE })
        const registro = await Recuperacao.findByPk(token_hash, { transaction, lock: transaction.LOCK.UPDATE })
        if (!usuario?.ativo || registro.usada || registro.expira_em <= new Date()) falhar(400, 'Este link é inválido ou expirou.')
        await usuario.update({ senha: await bcrypt.hash(senha, Number(process.env.BCRYPT_SALT_ROUNDS) || 10) }, { transaction })
        await Recuperacao.update({ usada: true }, { where: { idUsuario: usuario.codUsuario }, transaction })
        await revogarSessoes(usuario.codUsuario, transaction)
    })
    res.json({ mensagem: 'Senha redefinida. Entre novamente na conta.' })
}))
module.exports = router
module.exports.mail = mail

require('dotenv').config({ path: require('path').join(__dirname, '.env'), quiet: true })
const express = require('express')
const cors = require('cors')
const helmet = require('helmet')
const { rateLimit } = require('express-rate-limit')
const db = require('./db/conn')
const app = express()
app.disable('x-powered-by')
if (process.env.TRUST_PROXY === '1') app.set('trust proxy', 1)
app.use(helmet())
const origens = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5500,http://127.0.0.1:5500,http://localhost:3000,http://127.0.0.1:3000').split(',').map(v => { try { return new URL(v.trim()).origin } catch { return '' } }).filter(Boolean)
app.use(cors({ origin(origin, callback) { let local = false; try { local = process.env.NODE_ENV !== 'production' && ['localhost','127.0.0.1'].includes(new URL(origin).hostname) } catch {} callback(null, !origin || origens.includes(origin) || local) }, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type', 'Authorization'] }))
app.use(express.json({ limit: '128kb' }))
app.use(express.urlencoded({ extended: false, limit: '128kb' }))
app.use('/api', rateLimit({ windowMs: 15 * 60000, limit: 1000, standardHeaders: 'draft-8', legacyHeaders: false, message: { erro: 'Muitas solicitações. Aguarde alguns minutos.' } }))
const loginLimiter = rateLimit({ windowMs: 15 * 60000, limit: 20, skipSuccessfulRequests: true, standardHeaders: 'draft-8', legacyHeaders: false, message: { erro: 'Muitas tentativas. Aguarde antes de tentar novamente.' } })
app.use('/api/login', loginLimiter)
app.use('/api/auth/recuperar', rateLimit({ windowMs: 60 * 60000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false, message: { erro: 'Aguarde antes de solicitar outra recuperação.' } }))
app.use('/api', require('./routes/auth.routes'))
app.use('/api/auth', require('./routes/seguranca.routes'))
for (const rota of ['usuarios', 'produtos', 'categorias', 'estoque', 'pedidos', 'entregas', 'relatorios', 'admin', 'comunidade', 'pagamentos']) app.use(`/api/${rota}`, require(`./routes/${rota}.routes`))
app.get('/api/health', async (req, res) => {
    try { await db.authenticate(); res.json({ status: 'ok', modo_pagamento: 'demonstracao' }) }
    catch { res.status(503).json({ status: 'indisponivel' }) }
})
app.use((req, res) => res.status(404).json({ erro: 'Recurso não encontrado.' }))
app.use((err, req, res, next) => {
    const status = err.type === 'entity.parse.failed' ? 400 : err.status || 500
    if (status >= 500) console.error('Erro na API:', err.name)
    res.status(status).json({ erro: status === 400 ? 'Requisição inválida.' : status === 413 ? 'Requisição acima do tamanho permitido.' : 'Não foi possível concluir a operação.' })
})
module.exports = app

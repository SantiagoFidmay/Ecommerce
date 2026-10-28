require('dotenv').config({ path: require('path').join(__dirname, '.env'), quiet: true })
const db = require('./db/conn')
const { migrar } = require('./migrations')
const { expirarReservas } = require('./services/pedido.service')
async function iniciar() {
    if (!process.env.JWT_SECRET || (process.env.NODE_ENV === 'production' && (process.env.JWT_SECRET.length < 32 || process.env.JWT_SECRET.startsWith('substitua')))) throw new Error('Configure um JWT_SECRET próprio de pelo menos 32 caracteres.')
    await db.authenticate()
    await migrar()
    const app = require('./app')
    const port = Number(process.env.PORT) || 3001
    const server = app.listen(port, '0.0.0.0', () => console.log(`Sport Kicks API na porta ${port}. Pagamento somente em demonstração.`))
    let expirando = false
    const expirar = async () => {
        if (expirando) return
        expirando = true
        try { await expirarReservas() } catch (err) { console.error('Falha ao revisar reservas:', err.name) }
        finally { expirando = false }
    }
    const timer = setInterval(expirar, 60000)
    timer.unref()
    expirar()
    const encerrar = () => { clearInterval(timer); server.close(() => db.close().then(() => process.exit(0))) }
    process.once('SIGTERM', encerrar)
    process.once('SIGINT', encerrar)
    return server
}
if (require.main === module) iniciar().catch(err => { console.error('Não foi possível iniciar a API:', err.message); process.exitCode = 1; db.close() })
module.exports = { iniciar }

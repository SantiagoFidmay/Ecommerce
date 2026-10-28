require('dotenv').config({ path: require('path').join(__dirname, '../.env'), quiet: true })
const db = require('../db/conn')
const { Usuario } = require('../models/rel')
const { migrar } = require('../migrations')
async function promover() {
    const email = process.argv[2]?.trim().toLowerCase()
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Use npm run admin -- seu-email. Cadastre sua conta na loja primeiro.')
    await migrar()
    const usuario = await Usuario.findOne({ where: { email, ativo: true } })
    if (!usuario) throw new Error('Conta ativa não encontrada. Cadastre-se na loja antes de executar este comando.')
    await usuario.update({ tipo_usuario: 'ADMIN' })
    console.log('Conta promovida a administrador. Entre novamente na loja para abrir o painel.')
}
promover().catch(err => { console.error(err.message); process.exitCode = 1 }).finally(() => db.close())

const path = require('node:path')
const crypto = require('node:crypto')
const assert = require('node:assert/strict')
require('dotenv').config({ path: path.join(__dirname, '../../.env'), quiet: true })

async function ambiente() {
    const mysql = require('mysql2/promise')
    const admin = await mysql.createConnection({ host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASS })
    const nome = `sportkicks_test_${crypto.randomBytes(6).toString('hex')}`
    await admin.query('CREATE DATABASE ' + mysql.escapeId(nome))
    delete process.env.MYSQL_URL; delete process.env.DATABASE_URL
    process.env.DB_NAME = nome; process.env.NODE_ENV = 'test'; process.env.BCRYPT_SALT_ROUNDS = '4'; process.env.JWT_SECRET ||= crypto.randomBytes(32).toString('hex')
    const db = require('../../db/conn')
    const models = require('../../models/rel')
    let server
    const fechar = async () => {
        if (server) await new Promise(resolve => server.close(resolve))
        await db.close()
        assert.match(nome, /^sportkicks_test_[0-9a-f]{12}$/)
        await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(nome)); await admin.end()
    }
    try {
        await require('../../migrations').migrar()
        const senha = await require('bcryptjs').hash('SenhaTeste123', 4)
        const endereco = { cep: '01001000', rua: 'Rua de Teste', numero: '25', bairro: 'Centro', cidade: 'São Paulo', estado: 'SP' }
        const cliente = await models.Usuario.create({ nome: 'Cliente Teste', email: 'cliente@example.test', cpf: '52998224725', senha, ...endereco })
        const outro = await models.Usuario.create({ nome: 'Outro Cliente', email: 'outro@example.test', cpf: '11144477735', senha, ...endereco })
        const gestor = await models.Usuario.create({ nome: 'Gestor Teste', email: 'admin@example.test', cpf: '12345678909', senha, tipo_usuario: 'ADMIN', ...endereco })
        const categoria = await models.Categoria.create({ nome: 'Corrida' })
        const produto = await models.Produto.create({ nome: 'Modelo Teste', marca: 'Adidas', preco: '100.00', codigo_produto: 'MODELO-TESTE', imagem_url: '../assets/images/placeholder.svg', idCategoria: categoria.codCategoria })
        await models.Estoque.create({ idProduto: produto.codProduto, quantidade: 5 })
        const variante = await models.Variante.create({ idProduto: produto.codProduto, tamanho: '40', cor: 'Branco', sku: 'TESTE-40-BRANCO', quantidade: 5 })
        await models.Midia.create({ idProduto: produto.codProduto, tipo: 'REVIEW', url: 'https://www.youtube.com/watch?v=lqaQtL1nIKk', titulo: 'Review de teste' })
        server = await new Promise(resolve => { const s = require('../../app').listen(0, '127.0.0.1', () => resolve(s)) })
        const base = `http://127.0.0.1:${server.address().port}/api`
        const request = async (rota, token, method = 'GET', body) => {
            const resposta = await fetch(base + rota, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
            return { status: resposta.status, dados: await resposta.json(), headers: resposta.headers }
        }
        const login = async (email, senha = 'SenhaTeste123') => {
            const res = await request('/login', null, 'POST', { email, senha }); assert.equal(res.status, 200); return res.dados.token
        }
        const tokens = { cliente: await login(cliente.email), outro: await login(outro.email), gestor: await login(gestor.email) }
        return { db, models, base, request, login, tokens, cliente, outro, gestor, produto, variante, categoria, fechar }
    } catch (err) { await fechar(); throw err }
}
module.exports = { ambiente }

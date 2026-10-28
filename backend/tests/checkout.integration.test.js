const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const crypto = require('node:crypto')
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true })
const mysql = require('mysql2/promise')
const nomeTeste = `sportkicks_test_${crypto.randomBytes(6).toString('hex')}`
const config = { host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASS }
let admin, db, models, server, base, token, usuario, produto, categoria

before(async () => {
    admin = await mysql.createConnection(config)
    await admin.query('CREATE DATABASE ' + mysql.escapeId(nomeTeste))
    delete process.env.MYSQL_URL
    delete process.env.DATABASE_URL
    process.env.DB_NAME = nomeTeste
    db = require('../db/conn')
    db.options.logging = false
    models = require('../models/rel')
    await db.sync()
    categoria = await models.Categoria.create({ nome: 'Teste' })
    usuario = await models.Usuario.create({ nome: 'Cliente de teste', email: 'checkout@example.test', cpf: '00000000000', senha: 'apenas-fixture',
        cep: '01001000', rua: 'Praça da Sé', numero: '1', bairro: 'Sé', cidade: 'São Paulo', estado: 'SP' })
    produto = await models.Produto.create({ nome: 'Tênis de teste', preco: '100.00', idCategoria: categoria.codCategoria })
    await models.Estoque.create({ idProduto: produto.codProduto, quantidade: 20 })
    token = require('jsonwebtoken').sign({ id: usuario.codUsuario }, process.env.JWT_SECRET || 'segredo-apenas-para-testes')
    process.env.JWT_SECRET ||= 'segredo-apenas-para-testes'
    const app = require('express')()
    app.use(require('express').json())
    app.use('/api/pedidos', require('../routes/pedidos.routes'))
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)) })
    base = `http://127.0.0.1:${server.address().port}/api/pedidos`
})

after(async () => {
    if (server) await new Promise(resolve => server.close(resolve))
    if (db) await db.close()
    if (admin) {
        // Nunca usa DB_NAME: só remove o banco isolado criado por este teste.
        assert.match(nomeTeste, /^sportkicks_test_[0-9a-f]{12}$/)
        await admin.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(nomeTeste))
        await admin.end()
    }
})

async function enviar(dados, rota = '', autenticado = true) {
    const resposta = await fetch(base + rota, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(autenticado ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(dados) })
    return { status: resposta.status, dados: await resposta.json() }
}
const item = quantidade => ({ idProduto: produto.codProduto, quantidade })
const pedido = quantidade => ({ itens: [item(quantidade)], forma_pagamento: 'PIX' })
const estoque = async () => (await models.Estoque.findOne({ where: { idProduto: produto.codProduto } })).quantidade

test('resumo e confirmação exigem login', async () => {
    assert.equal((await enviar(pedido(1), '', false)).status, 401)
    assert.equal((await enviar(pedido(1), '/resumo', false)).status, 401)
})

test('rejeita quantidades inválidas e não altera pedidos nem estoque', async () => {
    for (const quantidade of [-1, 0, 1.5, '1', null, 1000]) {
        assert.equal((await enviar(pedido(quantidade))).status, 400)
    }
    assert.equal((await enviar({ itens: {}, forma_pagamento: 'PIX' })).status, 400)
    assert.equal(await models.Pedido.count(), 0)
    assert.equal(await estoque(), 20)
})

test('resumo usa preço do banco e desconto pela soma das unidades', async () => {
    const res = await enviar({ itens: [{ ...item(3), preco: 0.01 }] }, '/resumo')
    assert.equal(res.status, 200)
    assert.equal(res.dados.valorSubtotal, 300)
    assert.equal(res.dados.valorDesconto, 15)
    assert.equal(res.dados.valorFrete, 15.9)
    assert.equal(res.dados.valorTotal, 300.9)
    assert.equal(await estoque(), 20)
})

test('soma o estoque de linhas repetidas com tamanhos diferentes', async () => {
    const res = await enviar({ itens: [{ ...item(11), tamanho: '40' }, { ...item(10), tamanho: '41' }], forma_pagamento: 'PIX' })
    assert.equal(res.status, 409)
    assert.equal(await estoque(), 20)
    assert.equal(await models.Pedido.count(), 0)
})

test('produto inexistente, inativo, pagamento e endereço inválidos não geram venda', async () => {
    assert.equal((await enviar({ ...pedido(1), itens: [{ idProduto: 999999, quantidade: 1 }] })).status, 409)
    await produto.update({ ativo: false })
    assert.equal((await enviar(pedido(1))).status, 409)
    await produto.update({ ativo: true })
    assert.equal((await enviar({ ...pedido(1), forma_pagamento: 'INVALIDO' })).status, 400)
    assert.equal((await enviar({ ...pedido(1), endereco_entrega: {} })).status, 400)
    assert.equal(await models.Pedido.count(), 0)
})

test('mudança de preço exige nova confirmação', async () => {
    const res = await enviar({ ...pedido(1), valorTotalEsperado: 0.01 })
    assert.equal(res.status, 409)
    assert.equal(await estoque(), 20)
    assert.equal(await models.Pedido.count(), 0)
})

test('falha ao gravar entrega desfaz pedido, itens e baixa de estoque', async t => {
    const mock = t.mock.method(models.Entrega, 'create', async () => { throw new Error('falha de teste') })
    try {
        assert.equal((await enviar(pedido(1))).status, 500)
        assert.equal(await models.Pedido.count(), 0)
        assert.equal(await models.ItemPedido.count(), 0)
        assert.equal(await estoque(), 20)
    } finally { mock.mock.restore() }
})

test('confirma pedido pendente, valores e endereço editado, com baixa exata', async () => {
    const res = await enviar({ ...pedido(2), valorTotalEsperado: 215.9, endereco_entrega: {
        cep: '01001-000', rua: 'Rua de teste', numero: '25', complemento: 'Apto 2', bairro: 'Centro', cidade: 'São Paulo', estado: 'sp'
    } })
    assert.equal(res.status, 201)
    assert.equal(res.dados.pedido.status, 'PENDENTE')
    assert.equal(res.dados.pedido.valorTotal, 215.9)
    assert.equal(await estoque(), 18)
    const entrega = await models.Entrega.findOne({ where: { idPedido: res.dados.pedido.id } })
    assert.match(entrega.endereco_entrega, /Rua de teste, 25 - Apto 2/)
    assert.equal(entrega.cep_entrega, '01001000')
    const venda = await models.ItemPedido.findOne({ where: { idPedido: res.dados.pedido.id } })
    assert.equal(venda.quantidade, 2)
    assert.equal(Number(venda.preco_unitario), 100)
})

test('duas compras simultâneas da última unidade: só uma é aceita', async () => {
    await models.Estoque.update({ quantidade: 1 }, { where: { idProduto: produto.codProduto } })
    const antes = await models.Pedido.count()
    const respostas = await Promise.all([enviar(pedido(1)), enviar(pedido(1))])
    assert.deepEqual(respostas.map(r => r.status).sort(), [201, 409])
    assert.equal(await estoque(), 0)
    assert.equal(await models.Pedido.count(), antes + 1)
})

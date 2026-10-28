const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const path = require('node:path')
const crypto = require('node:crypto')
const bcrypt = require('bcryptjs')
const mysql = require('mysql2/promise')
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true })
const nomeTeste = `sportkicks_test_${crypto.randomBytes(6).toString('hex')}`
const config = { host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASS }
let conexao, db, models, server, base, cliente, outro, admin, compra
const endereco = { cep: '01001000', rua: 'Praça da Sé', numero: '1', bairro: 'Sé', cidade: 'São Paulo', estado: 'SP' }
const senhaOriginal = 'SenhaTeste123'

before(async () => {
    conexao = await mysql.createConnection(config)
    await conexao.query('CREATE DATABASE ' + mysql.escapeId(nomeTeste))
    delete process.env.MYSQL_URL
    delete process.env.DATABASE_URL
    process.env.DB_NAME = nomeTeste
    process.env.BCRYPT_SALT_ROUNDS = '4'
    process.env.JWT_SECRET ||= crypto.randomBytes(32).toString('hex')
    db = require('../db/conn')
    db.options.logging = false
    models = require('../models/rel')
    await db.sync()
    const senha = await bcrypt.hash(senhaOriginal, 4)
    cliente = await models.Usuario.create({ nome: 'Cliente A', email: 'a@example.test', cpf: '52998224725', senha, ...endereco })
    outro = await models.Usuario.create({ nome: 'Cliente B', email: 'b@example.test', cpf: '11144477735', senha, ...endereco })
    admin = await models.Usuario.create({ nome: 'Admin', email: 'admin@example.test', cpf: '12345678909', senha, tipo_usuario: 'ADMIN', ...endereco })
    const categoria = await models.Categoria.create({ nome: 'Corrida' })
    const produto = await models.Produto.create({ nome: 'Tênis teste', preco: '100.00', idCategoria: categoria.codCategoria })
    for (let i = 0; i < 3; i++) {
        const pedido = await models.Pedido.create({ idUsuario: cliente.codUsuario, status: i === 2 ? 'ENVIADO' : 'PENDENTE', valorTotal: 215.9, dataPedido: '2026-01-02T12:00:00Z' })
        for (let item = 0; item < 2; item++) await models.ItemPedido.create({ idPedido: pedido.codPedido, idProduto: produto.codProduto, quantidade: 1, preco_unitario: 100, subtotal: 100 })
        await models.Entrega.create({ idPedido: pedido.codPedido, endereco_entrega: 'Endereço original da compra', cep_entrega: '01001000' })
        compra = pedido
    }
    await models.Pedido.create({ idUsuario: outro.codUsuario })
    const app = require('express')()
    app.use(require('express').json())
    app.use('/api/usuarios', require('../routes/usuarios.routes'))
    app.use('/api/pedidos', require('../routes/pedidos.routes'))
    app.use('/api/entregas', require('../routes/entregas.routes'))
    app.use('/api', require('../routes/auth.routes'))
    server = await new Promise(resolve => { const s = app.listen(0, '127.0.0.1', () => resolve(s)) })
    base = `http://127.0.0.1:${server.address().port}/api`
})

after(async () => {
    if (server) await new Promise(resolve => server.close(resolve))
    if (db) await db.close()
    if (conexao) {
        assert.match(nomeTeste, /^sportkicks_test_[0-9a-f]{12}$/)
        await conexao.query('DROP DATABASE IF EXISTS ' + mysql.escapeId(nomeTeste))
        await conexao.end()
    }
})

async function requisitar(rota, usuario = cliente, method = 'GET', body) {
    const token = usuario && (usuario.__token || require('jsonwebtoken').sign({ id: usuario.codUsuario }, process.env.JWT_SECRET))
    const resposta = await fetch(base + rota, { method, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) })
    return { status: resposta.status, dados: await resposta.json() }
}

test('perfil e pedidos exigem autenticação e não expõem hash de senha', async () => {
    for (const rota of ['/usuarios/perfil', '/pedidos/meus-pedidos', `/pedidos/${compra.codPedido}`]) assert.equal((await requisitar(rota, null)).status, 401)
    const res = await requisitar('/usuarios/perfil')
    assert.equal(res.status, 200)
    assert.equal(res.dados.codUsuario, cliente.codUsuario)
    assert.equal(res.dados.senha, undefined)
})

test('cliente não lê nem altera outra conta; administrador mantém acesso autorizado', async () => {
    for (const method of ['GET', 'PATCH', 'PUT']) {
        assert.equal((await requisitar(`/usuarios/${outro.codUsuario}`, cliente, method, method === 'GET' ? undefined : { nome: 'Invadido' })).status, 403)
    }
    assert.equal((await requisitar(`/usuarios/${outro.codUsuario}`, admin)).status, 200)
    assert.equal((await requisitar(`/usuarios/${outro.codUsuario}`, admin, 'PATCH', { nome: 'Cliente B atualizado' })).status, 200)
    assert.equal((await models.Usuario.findByPk(outro.codUsuario)).nome, 'Cliente B atualizado')
    assert.equal((await requisitar('/usuarios', cliente)).status, 403)
})

test('perfil rejeita promoção de privilégio e valida campos no servidor', async () => {
    for (const dados of [{ tipo_usuario: 'ADMIN' }, { ativo: false }, { nome: ' ' }, { telefone: '123' }, { rua: null }, { cep: '123' }, { estado: 'XX' }, []]) {
        assert.equal((await requisitar('/usuarios/perfil', cliente, 'PATCH', dados)).status, 400)
    }
    assert.equal((await models.Usuario.findByPk(cliente.codUsuario)).tipo_usuario, 'CLIENTE')
})

test('atualização própria salva endereço e nome sem alterar endereço de pedidos existentes', async () => {
    const res = await requisitar('/usuarios/perfil', cliente, 'PATCH', { nome: 'Cliente Atualizado', ...endereco, numero: '25', complemento: 'Apto 5', estado: 'sp' })
    assert.equal(res.status, 200)
    assert.equal(res.dados.usuario.numero, '25')
    assert.equal(res.dados.usuario.estado, 'SP')
    assert.equal(res.dados.usuario.senha, undefined)
    const detalhe = await requisitar(`/pedidos/${compra.codPedido}`)
    assert.equal(detalhe.dados.entregaPedido.endereco_entrega, 'Endereço original da compra')
})

test('PUT trata e-mail e CPF duplicados como conflito e exige senha atual para mudança própria', async () => {
    const dados = { nome: 'Cliente', email: outro.email, cpf: cliente.cpf }
    assert.equal((await requisitar(`/usuarios/${cliente.codUsuario}`, cliente, 'PUT', dados)).status, 409)
    assert.equal((await requisitar(`/usuarios/${cliente.codUsuario}`, cliente, 'PUT', { ...dados, email: cliente.email, cpf: outro.cpf })).status, 409)
    assert.equal((await requisitar(`/usuarios/${cliente.codUsuario}`, cliente, 'PUT', { ...dados, email: 'novo@example.test' })).status, 400)
    assert.equal((await requisitar(`/usuarios/${cliente.codUsuario}`, cliente, 'PUT', { ...dados, email: cliente.email, cpf: '111' })).status, 400)
})

test('troca de senha exige senha atual e bcrypt; senha antiga deixa de autenticar', async () => {
    for (const dados of [{ senha: 'NovaSenha123' }, { senha: 'NovaSenha123', senha_atual: 'errada' }, { senha: 'curta', senha_atual: senhaOriginal }]) {
        assert.equal((await requisitar('/usuarios/perfil', cliente, 'PATCH', dados)).status, 400)
    }
    const res = await requisitar('/usuarios/perfil', cliente, 'PATCH', { senha: 'NovaSenha123', senha_atual: senhaOriginal })
    assert.equal(res.status, 200)
    assert.equal(res.dados.usuario.senha, undefined)
    const salvo = await models.Usuario.findByPk(cliente.codUsuario)
    assert.notEqual(salvo.senha, 'NovaSenha123')
    assert.equal(await bcrypt.compare('NovaSenha123', salvo.senha), true)
    assert.equal((await requisitar('/login', null, 'POST', { email: cliente.email, senha: senhaOriginal })).status, 401)
    const login = await requisitar('/login', null, 'POST', { email: cliente.email, senha: 'NovaSenha123' })
    assert.equal(login.status, 200)
    cliente.__token = login.dados.token
})

test('histórico lista apenas compras próprias com contagem distinta e paginação estável', async () => {
    const res = await requisitar('/pedidos/meus-pedidos?limite=1&pagina=1')
    assert.equal(res.status, 200)
    assert.equal(res.dados.total, 3)
    assert.equal(res.dados.totalPaginas, 3)
    assert.equal(res.dados.pedidos.length, 1)
    assert.equal(res.dados.pedidos[0].codPedido, compra.codPedido)
    assert.equal(res.dados.pedidos[0].itensPedido.length, 2)
    const pagina2 = await requisitar('/pedidos/meus-pedidos?limite=1&pagina=2')
    assert.notEqual(pagina2.dados.pedidos[0].codPedido, res.dados.pedidos[0].codPedido)
    const apenasOutro = await requisitar('/pedidos/meus-pedidos', outro)
    assert.equal(apenasOutro.dados.total, 1)
    assert.equal(apenasOutro.dados.pedidos[0].idUsuario, outro.codUsuario)
})

test('filtro de status e parâmetros inválidos são tratados pela API', async () => {
    const res = await requisitar('/pedidos/meus-pedidos?status=ENVIADO')
    assert.equal(res.dados.total, 1)
    assert.equal(res.dados.pedidos[0].status, 'ENVIADO')
    for (const query of ['pagina=0', 'limite=51', 'pagina=1.5', 'status=INVALIDO']) assert.equal((await requisitar('/pedidos/meus-pedidos?' + query)).status, 400)
})

test('detalhes bloqueiam compra de outra conta e aceitam administrador; IDs inválidos retornam 400', async () => {
    assert.equal((await requisitar(`/pedidos/${compra.codPedido}`, outro)).status, 403)
    const res = await requisitar(`/pedidos/${compra.codPedido}`, admin)
    assert.equal(res.status, 200)
    assert.equal(res.dados.usuarioPedido, undefined)
    assert.equal((await requisitar('/pedidos/999999')).status, 404)
    for (const rota of ['/pedidos/abc', '/pedidos/0', '/usuarios/abc']) assert.equal((await requisitar(rota)).status, 400)
})

test('consulta direta da entrega protege os mesmos dados da tela de pedido', async () => {
    const rota = `/entregas/pedido/${compra.codPedido}`
    assert.equal((await requisitar(rota, null)).status, 401)
    assert.equal((await requisitar(rota, outro)).status, 403)
    assert.equal((await requisitar(rota, cliente)).status, 200)
    assert.equal((await requisitar(rota, admin)).status, 200)
    assert.equal((await requisitar('/entregas/pedido/abc')).status, 400)
})

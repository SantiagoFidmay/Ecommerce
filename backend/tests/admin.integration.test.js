const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
let a
const email = 'principal@example.test'

before(async () => {
    process.env.ADMIN_EMAIL = email
    a = await require('./helpers/app').ambiente()
})
after(async () => { if (a) await a.fechar() })

test('cadastro atribui ADMIN somente ao e-mail configurado, normalizando espaços e maiúsculas', async () => {
    const res = await a.request('/usuarios', null, 'POST', {
        nome: 'Administrador Principal', email: ` ${email.toUpperCase()} `, cpf: '16899535009',
        senha: 'SenhaTeste123', cep: '01001000', rua: 'Rua de Teste', numero: '25', bairro: 'Centro', cidade: 'São Paulo', estado: 'SP'
    })
    assert.equal(res.status, 201)
    assert.equal(res.dados.usuario.tipo, 'ADMIN')
    assert.equal((await a.request('/admin/produtos', res.dados.token)).status, 200)
    assert.equal((await a.models.Usuario.findByPk(a.cliente.codUsuario)).tipo_usuario, 'CLIENTE')
})

test('conta principal existente é promovida no login somente após validar a senha', async () => {
    await a.models.Usuario.update({ tipo_usuario: 'CLIENTE' }, { where: { email } })
    assert.equal((await a.request('/login', null, 'POST', { email, senha: 'SenhaIncorreta123' })).status, 401)
    assert.equal((await a.models.Usuario.findOne({ where: { email } })).tipo_usuario, 'CLIENTE')
    const res = await a.request('/login', null, 'POST', { email, senha: 'SenhaTeste123' })
    assert.equal(res.status, 200)
    assert.equal(res.dados.usuario.tipo, 'ADMIN')
})

test('inicialização restaura o cargo principal sem promover outras contas', async () => {
    await a.models.Usuario.update({ tipo_usuario: 'CLIENTE' }, { where: { email } })
    const { garantirAdminPrincipal } = require('../services/admin.service')
    await garantirAdminPrincipal()
    await garantirAdminPrincipal()
    assert.equal((await a.models.Usuario.findOne({ where: { email } })).tipo_usuario, 'ADMIN')
    assert.equal((await a.models.Usuario.findByPk(a.cliente.codUsuario)).tipo_usuario, 'CLIENTE')
})

test('outro administrador não pode desativar ou rebaixar a conta principal', async () => {
    const principal = await a.models.Usuario.findOne({ where: { email } })
    for (const dados of [{ ativo: false, tipo_usuario: 'ADMIN' }, { ativo: true, tipo_usuario: 'CLIENTE' }]) {
        assert.equal((await a.request(`/admin/usuarios/${principal.codUsuario}/acesso`, a.tokens.gestor, 'PATCH', dados)).status, 409)
    }
    assert.equal((await a.request(`/usuarios/${principal.codUsuario}`, a.tokens.gestor, 'DELETE')).status, 409)
    await principal.reload()
    assert.equal(principal.ativo, true)
    assert.equal(principal.tipo_usuario, 'ADMIN')
})

test('perfil não permite transferir o e-mail reservado para outra conta', async () => {
    const principal = await a.models.Usuario.findOne({ where: { email } })
    assert.equal((await a.request(`/usuarios/${principal.codUsuario}`, a.tokens.gestor, 'PUT', {
        nome: principal.nome, email: 'alterado@example.test', cpf: principal.cpf
    })).status, 409)
    await principal.destroy()
    assert.equal((await a.request(`/usuarios/${a.cliente.codUsuario}`, a.tokens.gestor, 'PUT', {
        nome: a.cliente.nome, email, cpf: a.cliente.cpf
    })).status, 409)
    assert.equal((await a.models.Usuario.findByPk(a.cliente.codUsuario)).tipo_usuario, 'CLIENTE')
})

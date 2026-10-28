const bcrypt = require('bcryptjs')
const { Op } = require('sequelize')
const { Usuario } = require('../models/rel')
const { validarCPF } = require('../utils/cpf.util')
const { validarEndereco, falhar } = require('./checkout.service')

const camposEndereco = ['cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'estado']
const limites = { nome: 100, telefone: 20, cep: 10, rua: 200, numero: 20, complemento: 100, bairro: 100, cidade: 100, estado: 2 }

function usuarioPublico(usuario) {
    const { senha, ...dados } = usuario.get({ plain: true })
    return dados
}

function identificarUsuario(req) {
    const id = req.params.id ?? String(req.usuario.codUsuario)
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id)) || Number(id) > 2147483647) falhar(400, 'Código de usuário inválido.')
    if (req.usuario.tipo_usuario !== 'ADMIN' && Number(id) !== req.usuario.codUsuario) falhar(403, 'Acesso negado.')
    return Number(id)
}

async function prepararAtualizacao(body, usuario, autor, completa = false) {
    if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length) falhar(400, 'Informe os dados que deseja atualizar.')
    const permitidos = [...Object.keys(limites), 'senha', 'senha_atual', ...(completa ? ['email', 'cpf'] : [])]
    if (Object.keys(body).some(campo => !permitidos.includes(campo))) falhar(400, 'A atualização contém campos não permitidos.')
    const dados = {}
    for (const [campo, limite] of Object.entries(limites)) {
        if (body[campo] === undefined) continue
        if (typeof body[campo] !== 'string') falhar(400, `O campo ${campo} é inválido.`)
        dados[campo] = body[campo].trim()
        if (dados[campo].length > limite) falhar(400, `O campo ${campo} deve ter até ${limite} caracteres.`)
    }
    if (dados.nome !== undefined && dados.nome.length < 2) falhar(400, 'Informe um nome com pelo menos dois caracteres.')
    if (dados.telefone && !/^\d{10,11}$/.test(dados.telefone.replace(/\D/g, ''))) falhar(400, 'Informe um telefone com DDD válido.')
    if (camposEndereco.some(campo => body[campo] !== undefined)) {
        const endereco = { ...usuario.get({ plain: true }), ...dados }
        const validado = validarEndereco(endereco)
        dados.cep = validado.cep
        dados.estado = endereco.estado.trim().toUpperCase()
    }
    let alteraIdentidade = false
    if (completa) {
        if (!dados.nome || typeof body.email !== 'string' || typeof body.cpf !== 'string') falhar(400, 'Nome, e-mail e CPF são obrigatórios na atualização completa.')
        dados.email = body.email.trim().toLowerCase()
        dados.cpf = body.cpf.replace(/\D/g, '')
        if (dados.email.length > 150 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(dados.email)) falhar(400, 'E-mail inválido.')
        if (!validarCPF(dados.cpf)) falhar(400, 'CPF inválido.')
        alteraIdentidade = dados.email !== usuario.email || dados.cpf !== usuario.cpf
        const duplicado = await Usuario.findOne({ where: {
            codUsuario: { [Op.ne]: usuario.codUsuario }, [Op.or]: [{ email: dados.email }, { cpf: dados.cpf }]
        } })
        if (duplicado) falhar(409, 'E-mail ou CPF já cadastrado em outra conta.')
    }
    if (body.senha !== undefined) {
        if (typeof body.senha !== 'string' || body.senha.length < 8 || Buffer.byteLength(body.senha, 'utf8') > 72) {
            falhar(400, 'Use uma senha com pelo menos 8 caracteres e até 72 bytes.')
        }
    }
    // Uma sessão autenticada não dispensa a senha atual ao trocar credenciais próprias.
    if ((body.senha !== undefined || alteraIdentidade) && autor.codUsuario === usuario.codUsuario) {
        if (typeof body.senha_atual !== 'string' || Buffer.byteLength(body.senha_atual, 'utf8') > 72 ||
            !await bcrypt.compare(body.senha_atual, usuario.senha)) falhar(400, 'A senha atual não confere.')
    }
    if (body.senha !== undefined) dados.senha = await bcrypt.hash(body.senha, Number(process.env.BCRYPT_SALT_ROUNDS) || 10)
    if (!Object.keys(dados).length) falhar(400, 'Informe os dados que deseja atualizar.')
    return dados
}

module.exports = { identificarUsuario, prepararAtualizacao, usuarioPublico }

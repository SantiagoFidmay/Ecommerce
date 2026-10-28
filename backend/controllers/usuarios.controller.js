const db = require('../db/conn')
const { revogarSessoes } = require('../services/sessao.service')
const { Usuario } = require('../models/rel')

// GET /api/usuarios/perfil (privado)
const getPerfil = async (req, res) => {
    try {
        const usuario = await Usuario.findByPk(req.usuario.codUsuario, {
            attributes: { exclude: ['senha'] }
        })
        return res.json(usuario)
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao buscar perfil.', detalhe: err.message })
    }
}

// GET /api/usuarios (admin)
const listarTodos = async (req, res) => {
    try {
        const usuarios = await Usuario.findAll({
            attributes: { exclude: ['senha'] },
            order: [['nome', 'ASC']]
        })
        return res.json({ total: usuarios.length, usuarios })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao listar usuários.', detalhe: err.message })
    }
}

const { identificarUsuario, prepararAtualizacao, usuarioPublico } = require('../services/perfil.service')

const responderErroPerfil = (res, erro) => {
    const status = erro.name === 'SequelizeUniqueConstraintError' ? 409 : erro.status || 500
    return res.status(status).json({ erro: status === 409 ? 'E-mail ou CPF já cadastrado em outra conta.'
        : erro.status ? erro.message : 'Não foi possível atualizar ou consultar a conta.' })
}

const getById = async (req, res) => {
    try {
        const id = identificarUsuario(req)
        const usuario = await Usuario.findByPk(id, { attributes: { exclude: ['senha'] } })
        if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' })
        return res.json(usuario)
    } catch (erro) { return responderErroPerfil(res, erro) }
}

const salvar = completa => async (req, res) => {
    try {
        const id = identificarUsuario(req)
        const usuario = await db.transaction(async transaction => {
            const registro = await Usuario.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE })
            if (!registro) throw Object.assign(new Error('Usuário não encontrado.'), { status: 404 })
            const dados = await prepararAtualizacao(req.body, registro, req.usuario, completa)
            await registro.update(dados, { transaction })
            if (dados.senha) await revogarSessoes(registro.codUsuario, transaction)
            return registro
        })
        return res.json({ mensagem: 'Dados atualizados com sucesso.', usuario: usuarioPublico(usuario), reautenticar: Boolean(req.body.senha && id === req.usuario.codUsuario) })
    } catch (erro) { return responderErroPerfil(res, erro) }
}

const atualizar = salvar(true)
const atualizarParcial = salvar(false)

// DELETE /api/usuarios/:id (admin — soft delete)
const desativar = async (req, res) => {
    try {
        const usuario = await Usuario.findByPk(req.params.id)
        if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' })
        const publico = await require('../services/acesso.service').alterarAcesso(usuario.codUsuario, req.usuario, { ativo: false, tipo_usuario: usuario.tipo_usuario })
        return res.json({ mensagem: 'Usuário desativado.', usuario: publico })
    } catch (erro) { return responderErroPerfil(res, erro) }
}

module.exports = { getPerfil, listarTodos, getById, atualizar, atualizarParcial, desativar }

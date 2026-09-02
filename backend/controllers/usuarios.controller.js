const bcrypt = require('bcryptjs')
const { Usuario } = require('../models/rel')
const { validarCPF } = require('../utils/cpf.util')

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

// GET /api/usuarios/:id
const getById = async (req, res) => {
    try {
        const usuario = await Usuario.findByPk(req.params.id, {
            attributes: { exclude: ['senha'] }
        })
        if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' })

        if (req.usuario.tipo !== 'ADMIN' && req.usuario.codUsuario !== usuario.codUsuario) {
            return res.status(403).json({ erro: 'Acesso negado.' })
        }

        return res.json(usuario)
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao buscar usuário.', detalhe: err.message })
    }
}

// PUT /api/usuarios/:id (atualização completa)
const atualizar = async (req, res) => {
    try {
        const usuario = await Usuario.findByPk(req.params.id)
        if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' })

        if (req.usuario.tipo !== 'ADMIN' && req.usuario.codUsuario !== usuario.codUsuario) {
            return res.status(403).json({ erro: 'Acesso negado.' })
        }

        const { nome, email, cpf, senha, telefone, cep, rua, numero, complemento, bairro, cidade, estado } = req.body

        if (cpf && !validarCPF(cpf)) {
            return res.status(400).json({ erro: 'CPF inválido.' })
        }

        if (email && email !== usuario.email) {
            const emailExiste = await Usuario.findOne({ where: { email } })
            if (emailExiste) return res.status(409).json({ erro: 'E-mail já em uso.' })
        }

        const dados = { nome, email, cpf: cpf ? cpf.replace(/\D/g, '') : usuario.cpf, telefone, cep, rua, numero, complemento, bairro, cidade, estado }

        if (senha) {
            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10
            dados.senha = await bcrypt.hash(senha, saltRounds)
        }

        await usuario.update(dados)
        return res.json({ mensagem: 'Usuário atualizado com sucesso.' })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao atualizar usuário.', detalhe: err.message })
    }
}

// PATCH /api/usuarios/:id (atualização parcial)
const atualizarParcial = async (req, res) => {
    try {
        const usuario = await Usuario.findByPk(req.params.id)
        if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' })

        if (req.usuario.tipo !== 'ADMIN' && req.usuario.codUsuario !== usuario.codUsuario) {
            return res.status(403).json({ erro: 'Acesso negado.' })
        }

        const camposPermitidos = ['nome', 'telefone', 'cep', 'rua', 'numero', 'complemento', 'bairro', 'cidade', 'estado']
        const atualizacoes = {}
        camposPermitidos.forEach(campo => {
            if (req.body[campo] !== undefined) atualizacoes[campo] = req.body[campo]
        })

        if (req.body.senha) {
            const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS) || 10
            atualizacoes.senha = await bcrypt.hash(req.body.senha, saltRounds)
        }

        await usuario.update(atualizacoes)
        return res.json({ mensagem: 'Dados atualizados com sucesso.' })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao atualizar usuário.', detalhe: err.message })
    }
}

// DELETE /api/usuarios/:id (admin — soft delete)
const desativar = async (req, res) => {
    try {
        const usuario = await Usuario.findByPk(req.params.id)
        if (!usuario) return res.status(404).json({ erro: 'Usuário não encontrado.' })
        await usuario.update({ ativo: false })
        return res.json({ mensagem: 'Usuário desativado com sucesso.' })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao desativar usuário.', detalhe: err.message })
    }
}

module.exports = { getPerfil, listarTodos, getById, atualizar, atualizarParcial, desativar }

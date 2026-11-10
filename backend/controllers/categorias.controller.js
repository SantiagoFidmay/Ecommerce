const db = require('../db/conn')
const { Op } = require('sequelize')
const { Categoria, Produto } = require('../models/rel')
const { handler, id, texto, falhar, validarCampos, nomeBusca } = require('../utils/api.util')

// GET /api/categorias (público)
const listar = async (req, res) => {
    try {
        const categorias = await Categoria.findAll({
            where: { ativo: true },
            order: [['nome', 'ASC']]
        })
        return res.json({ total: categorias.length, categorias })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao listar categorias.', detalhe: err.message })
    }
}

// GET /api/categorias/:id (público)
const getById = async (req, res) => {
    try {
        const categoria = await Categoria.findByPk(req.params.id)
        if (!categoria) return res.status(404).json({ erro: 'Categoria não encontrada.' })
        return res.json(categoria)
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao buscar categoria.', detalhe: err.message })
    }
}

// POST /api/categorias (admin)
const criar = async (req, res) => {
    try {
        const { nome, descricao, icone } = req.body
        if (!nome) return res.status(400).json({ erro: 'Nome é obrigatório.' })

        const existe = await Categoria.findOne({ where: { nome } })
        if (existe) return res.status(409).json({ erro: 'Categoria já cadastrada.' })

        const categoria = await Categoria.create({ nome, descricao, icone })
        return res.status(201).json({ mensagem: 'Categoria criada com sucesso!', categoria })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao criar categoria.', detalhe: err.message })
    }
}

const buscarPorNome = handler(async (req, res) => {
    const categorias = await Categoria.findAll({ where: { nome: { [Op.like]: '%' + nomeBusca(req) + '%' } }, order: [['nome', 'ASC']] })
    res.json({ total: categorias.length, categorias })
})

const salvar = completa => handler(async (req, res) => {
    validarCampos(req.body, ['nome', 'descricao', 'icone', 'ativo'], completa ? ['nome'] : [])
    const dados = completa ? { descricao: null, icone: null, ativo: true, ...req.body } : { ...req.body }
    if (dados.nome !== undefined) dados.nome = texto(dados.nome, 80, true)
    for (const [campo, max] of [['descricao', 2000], ['icone', 50]]) {
        if (dados[campo] != null) dados[campo] = texto(dados[campo], max)
    }
    if (dados.ativo !== undefined && typeof dados.ativo !== 'boolean') falhar(400, 'Disponibilidade inválida.')
    const categoria = await db.transaction(async transaction => {
        const registro = await Categoria.findByPk(id(req.params.id), { transaction, lock: transaction.LOCK.UPDATE })
        if (!registro) falhar(404, 'Categoria não encontrada.')
        if (dados.ativo === false && await Produto.count({ where: { idCategoria: registro.codCategoria, ativo: true }, transaction })) falhar(409, 'Desative os produtos antes de desativar a categoria.')
        return registro.update(dados, { transaction })
    })
    res.json({ mensagem: 'Categoria atualizada!', categoria })
})
const atualizar = salvar(true)
const atualizarParcial = salvar(false)

// DELETE /api/categorias/:id (admin)
const deletar = async (req, res) => {
    try {
        const categoria = await Categoria.findByPk(req.params.id)
        if (!categoria) return res.status(404).json({ erro: 'Categoria não encontrada.' })
        if (await Produto.count({ where: { idCategoria: categoria.codCategoria, ativo: true } })) return res.status(409).json({ erro: 'Desative os produtos antes de desativar a categoria.' })
        await categoria.update({ ativo: false })
        return res.json({ mensagem: 'Categoria desativada.' })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao deletar categoria.', detalhe: err.message })
    }
}

module.exports = { listar, getById, buscarPorNome, criar, atualizar, atualizarParcial, deletar }

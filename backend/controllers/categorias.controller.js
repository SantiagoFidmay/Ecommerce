const { Categoria } = require('../models/rel')

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

// PUT /api/categorias/:id (admin)
const atualizar = async (req, res) => {
    try {
        const categoria = await Categoria.findByPk(req.params.id)
        if (!categoria) return res.status(404).json({ erro: 'Categoria não encontrada.' })
        await categoria.update(req.body)
        return res.json({ mensagem: 'Categoria atualizada!', categoria })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao atualizar categoria.', detalhe: err.message })
    }
}

// PATCH /api/categorias/:id (admin)
const atualizarParcial = async (req, res) => {
    try {
        const categoria = await Categoria.findByPk(req.params.id)
        if (!categoria) return res.status(404).json({ erro: 'Categoria não encontrada.' })
        const { nome, descricao, icone, ativo } = req.body
        await categoria.update({ nome, descricao, icone, ativo })
        return res.json({ mensagem: 'Categoria atualizada!' })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao atualizar categoria.', detalhe: err.message })
    }
}

// DELETE /api/categorias/:id (admin)
const deletar = async (req, res) => {
    try {
        const categoria = await Categoria.findByPk(req.params.id)
        if (!categoria) return res.status(404).json({ erro: 'Categoria não encontrada.' })
        await categoria.update({ ativo: false })
        return res.json({ mensagem: 'Categoria desativada.' })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao deletar categoria.', detalhe: err.message })
    }
}

module.exports = { listar, getById, criar, atualizar, atualizarParcial, deletar }

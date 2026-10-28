const { Estoque, Produto, Variante } = require('../models/rel')

// GET /api/estoque (admin)
const listar = async (req, res) => {
    try {
        const estoque = await Estoque.findAll({
            include: [{ model: Produto, as: 'produtoEstoque', attributes: ['codProduto', 'nome', 'marca', 'imagem_url'] }],
            order: [['quantidade', 'ASC']]
        })
        return res.json({ total: estoque.length, estoque })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao listar estoque.', detalhe: err.message })
    }
}

// GET /api/estoque/produto/:produto_id
const getByProduto = async (req, res) => {
    try {
        const estoque = await Estoque.findOne({
            where: { idProduto: req.params.produto_id },
            include: [{ model: Produto, as: 'produtoEstoque', attributes: ['codProduto', 'nome'] }]
        })
        if (!estoque) return res.status(404).json({ erro: 'Estoque não encontrado para este produto.' })
        return res.json(estoque)
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao buscar estoque.', detalhe: err.message })
    }
}

// POST /api/estoque (admin)
const criar = async (req, res) => {
    try {
        const { idProduto, quantidade, quantidade_minima } = req.body
        if (!Number.isSafeInteger(quantidade) || quantidade < 0 || (quantidade_minima !== undefined && (!Number.isSafeInteger(quantidade_minima) || quantidade_minima < 0))) return res.status(400).json({ erro: 'Quantidades devem ser inteiros não negativos.' })
        if (await Variante.count({ where: { idProduto } })) return res.status(409).json({ erro: 'Este produto usa opções de tamanho e cor. Movimente o estoque da opção no painel.' })

        if (!idProduto || quantidade === undefined) {
            return res.status(400).json({ erro: 'idProduto e quantidade são obrigatórios.' })
        }

        const produto = await Produto.findByPk(idProduto)
        if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' })

        const [estoque, criado] = await Estoque.findOrCreate({
            where: { idProduto },
            defaults: { idProduto, quantidade, quantidade_minima: quantidade_minima || 5 }
        })

        if (!criado) {
            await estoque.update({ quantidade, quantidade_minima: quantidade_minima || estoque.quantidade_minima })
        }

        return res.status(201).json({ mensagem: 'Estoque atualizado!', estoque })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao criar/atualizar estoque.', detalhe: err.message })
    }
}

// PUT /api/estoque/:id (admin)
const atualizar = async (req, res) => {
    try {
        const estoque = await Estoque.findByPk(req.params.id)
        if (!estoque) return res.status(404).json({ erro: 'Registro de estoque não encontrado.' })

        const { quantidade, quantidade_minima } = req.body
        if (await Variante.count({ where: { idProduto: estoque.idProduto } })) return res.status(409).json({ erro: 'Movimente o estoque por tamanho e cor no painel.' })
        if (!Number.isSafeInteger(quantidade) || quantidade < 0 || (quantidade_minima !== undefined && (!Number.isSafeInteger(quantidade_minima) || quantidade_minima < 0))) return res.status(400).json({ erro: 'Quantidades devem ser inteiros não negativos.' })
        await estoque.update({ quantidade, quantidade_minima, ultima_atualizacao: new Date() })

        return res.json({ mensagem: 'Estoque atualizado com sucesso!', estoque })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao atualizar estoque.', detalhe: err.message })
    }
}

// PATCH /api/estoque/:id/movimentar — Entrada/Saída (admin)
const movimentar = async (req, res) => {
    try {
        const estoque = await Estoque.findByPk(req.params.id)
        if (!estoque) return res.status(404).json({ erro: 'Estoque não encontrado.' })

        const { tipo, quantidade } = req.body
        if (await Variante.count({ where: { idProduto: estoque.idProduto } })) return res.status(409).json({ erro: 'Movimente o estoque por tamanho e cor no painel.' })
        if (!Number.isSafeInteger(quantidade) || quantidade < 1) return res.status(400).json({ erro: 'Quantidade deve ser um inteiro positivo.' })
        if (!tipo || !quantidade) return res.status(400).json({ erro: 'Tipo (entrada/saida) e quantidade são obrigatórios.' })

        let novaQtd = estoque.quantidade
        if (tipo === 'entrada') {
            novaQtd += parseInt(quantidade)
        } else if (tipo === 'saida') {
            novaQtd -= parseInt(quantidade)
            if (novaQtd < 0) return res.status(400).json({ erro: 'Estoque insuficiente para esta saída.' })
        } else {
            return res.status(400).json({ erro: 'Tipo inválido. Use "entrada" ou "saida".' })
        }

        await estoque.update({ quantidade: novaQtd, ultima_atualizacao: new Date() })
        return res.json({ mensagem: `${tipo === 'entrada' ? 'Entrada' : 'Saída'} registrada com sucesso!`, estoque })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao movimentar estoque.', detalhe: err.message })
    }
}

// GET /api/estoque/criticos (admin)
const getCriticos = async (req, res) => {
    try {
        const db = require('../db/conn')
        const { QueryTypes } = require('sequelize')
        const criticos = await db.query(
            `SELECT e.*, p.nome, p.marca, p.imagem_url 
             FROM estoque e
             JOIN produtos p ON e.idProduto = p.codProduto
             WHERE e.quantidade <= e.quantidade_minima AND p.ativo = true
             ORDER BY e.quantidade ASC`,
            { type: QueryTypes.SELECT }
        )
        return res.json({ total: criticos.length, criticos })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao buscar estoque crítico.', detalhe: err.message })
    }
}

module.exports = { listar, getByProduto, criar, atualizar, movimentar, getCriticos }

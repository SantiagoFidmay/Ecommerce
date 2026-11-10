const db = require('../db/conn')
const { Op } = require('sequelize')
const { Estoque, Produto, Variante, ItemPedido } = require('../models/rel')
const { handler, id, falhar, validarCampos, nomeBusca } = require('../utils/api.util')
const { registrar } = require('../services/estoque.service')

const getById = handler(async (req, res) => {
    const estoque = await Estoque.findByPk(id(req.params.id), { include: [{ model: Produto, as: 'produtoEstoque' }] })
    if (!estoque) falhar(404, 'Registro de estoque não encontrado.')
    res.json(estoque)
})

const buscarPorNome = handler(async (req, res) => {
    const estoque = await Estoque.findAll({ include: [{ model: Produto, as: 'produtoEstoque', where: { nome: { [Op.like]: `%${nomeBusca(req)}%` } } }], order: [['codEstoque', 'ASC']] })
    res.json({ total: estoque.length, estoque })
})

const salvar = completa => handler(async (req, res) => {
    validarCampos(req.body, ['quantidade', 'quantidade_minima'], completa ? ['quantidade', 'quantidade_minima'] : [])
    for (const valor of Object.values(req.body)) if (!Number.isSafeInteger(valor) || valor < 0 || valor > 1000000) falhar(400, 'Quantidades devem ser inteiros de 0 a 1000000.')
    const estoque = await db.transaction(async transaction => {
        const referencia = await Estoque.findByPk(id(req.params.id), { transaction })
        if (!referencia) falhar(404, 'Registro de estoque não encontrado.')
        await Produto.findByPk(referencia.idProduto, { transaction, lock: transaction.LOCK.UPDATE })
        const registro = await Estoque.findByPk(referencia.codEstoque, { transaction, lock: transaction.LOCK.UPDATE })
        if (!registro) falhar(404, 'Registro de estoque não encontrado.')
        if (req.body.quantidade !== undefined && req.body.quantidade !== registro.quantidade) {
            if (await Variante.count({ where: { idProduto: registro.idProduto }, transaction })) falhar(409, 'Movimente o estoque por tamanho e cor no painel.')
            await registrar({ idProduto: registro.idProduto, delta: req.body.quantidade - registro.quantidade, tipo: 'AJUSTE', motivo: 'Atualização administrativa do estoque.', idUsuario: req.usuario.codUsuario, transaction })
        }
        if (req.body.quantidade_minima !== undefined) await registro.update({ quantidade_minima: req.body.quantidade_minima, ultima_atualizacao: new Date() }, { transaction })
        return registro.reload({ transaction })
    })
    res.json({ mensagem: 'Estoque atualizado!', estoque })
})
const atualizar = salvar(true)
const atualizarParcial = salvar(false)

const deletar = handler(async (req, res) => {
    await db.transaction(async transaction => {
        const referencia = await Estoque.findByPk(id(req.params.id), { transaction })
        if (!referencia) falhar(404, 'Registro de estoque não encontrado.')
        await Produto.findByPk(referencia.idProduto, { transaction, lock: transaction.LOCK.UPDATE })
        const estoque = await Estoque.findByPk(referencia.codEstoque, { transaction, lock: transaction.LOCK.UPDATE })
        if (!estoque) falhar(404, 'Registro de estoque não encontrado.')
        if (estoque.quantidade || await Variante.count({ where: { idProduto: estoque.idProduto }, transaction }) || await ItemPedido.count({ where: { idProduto: estoque.idProduto }, transaction })) falhar(409, 'Só exclua estoque zerado, sem variantes e sem itens de pedidos vinculados.')
        await estoque.destroy({ transaction })
    })
    res.json({ mensagem: 'Registro de estoque excluído.' })
})

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
const criar = handler(async (req, res) => {
    validarCampos(req.body, ['idProduto', 'quantidade', 'quantidade_minima'], ['idProduto', 'quantidade'])
    const idProduto = id(req.body.idProduto)
    const quantidade = req.body.quantidade, quantidade_minima = req.body.quantidade_minima ?? 5
    for (const valor of [quantidade, quantidade_minima]) if (!Number.isSafeInteger(valor) || valor < 0 || valor > 1000000) falhar(400, 'Quantidades devem ser inteiros de 0 a 1000000.')
    const estoque = await db.transaction(async transaction => {
        if (!await Produto.findByPk(idProduto, { transaction, lock: transaction.LOCK.UPDATE })) falhar(404, 'Produto não encontrado.')
        if (await Estoque.count({ where: { idProduto }, transaction })) falhar(409, 'Este produto já possui estoque. Use PUT ou PATCH para atualizá-lo.')
        if (await Variante.count({ where: { idProduto }, transaction })) falhar(409, 'Este produto utiliza estoque por tamanho e cor.')
        const registro = await Estoque.create({ idProduto, quantidade: 0, quantidade_minima }, { transaction })
        if (quantidade) await registrar({ idProduto, delta: quantidade, tipo: 'ENTRADA', motivo: 'Cadastro do estoque.', idUsuario: req.usuario.codUsuario, transaction })
        return registro.reload({ transaction })
    })
    res.status(201).json({ mensagem: 'Estoque cadastrado!', estoque })
})

// PATCH /api/estoque/:id/movimentar (admin)
const movimentar = handler(async (req, res) => {
    validarCampos(req.body, ['tipo', 'quantidade'], ['tipo', 'quantidade'])
    const { tipo, quantidade } = req.body
    if (!['entrada', 'saida'].includes(tipo) || !Number.isSafeInteger(quantidade) || quantidade < 1 || quantidade > 1000000) falhar(400, 'Informe entrada ou saida e uma quantidade inteira positiva.')
    const estoque = await db.transaction(async transaction => {
        const referencia = await Estoque.findByPk(id(req.params.id), { transaction })
        if (!referencia) falhar(404, 'Estoque não encontrado.')
        await Produto.findByPk(referencia.idProduto, { transaction, lock: transaction.LOCK.UPDATE })
        const registro = await Estoque.findByPk(referencia.codEstoque, { transaction, lock: transaction.LOCK.UPDATE })
        if (!registro) falhar(404, 'Estoque não encontrado.')
        if (await Variante.count({ where: { idProduto: registro.idProduto }, transaction })) falhar(409, 'Movimente o estoque por tamanho e cor no painel.')
        await registrar({ idProduto: registro.idProduto, delta: tipo === 'entrada' ? quantidade : -quantidade, tipo: tipo === 'entrada' ? 'ENTRADA' : 'SAIDA', motivo: 'Movimentação administrativa de estoque.', idUsuario: req.usuario.codUsuario, transaction })
        return registro.reload({ transaction })
    })
    res.json({ mensagem: 'Movimentação registrada!', estoque })
})

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

module.exports = { listar, getByProduto, getById, buscarPorNome, criar, atualizar, atualizarParcial, deletar, movimentar, getCriticos }

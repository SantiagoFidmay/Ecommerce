const { Op } = require('sequelize')
const { ItemPedido, Produto } = require('../models/rel')
const { handler, id, nomeBusca, falhar, validarCampos } = require('../utils/api.util')
const { editarPedido } = require('../services/edicao-pedido.service')

const listar = handler(async (req, res) => {
    const itens = await ItemPedido.findAll({ where: req.query.idPedido ? { idPedido: id(req.query.idPedido) } : {}, include: [{ model: Produto, as: 'produtoItem' }], order: [['codItemPedido', 'DESC']] })
    res.json({ total: itens.length, itens })
})

const getById = handler(async (req, res) => {
    const item = await ItemPedido.findByPk(id(req.params.id), { include: [{ model: Produto, as: 'produtoItem' }] })
    if (!item) falhar(404, 'Item do pedido não encontrado.')
    res.json(item)
})

const buscarPorNome = handler(async (req, res) => {
    const nome = nomeBusca(req)
    const itens = await ItemPedido.findAll({ where: { [Op.or]: [{ nome_produto: { [Op.like]: `%${nome}%` } }, { '$produtoItem.nome$': { [Op.like]: `%${nome}%` } }] }, include: [{ model: Produto, as: 'produtoItem' }], order: [['codItemPedido', 'DESC']] })
    res.json({ total: itens.length, itens })
})

const campos = ['idPedido', 'idProduto', 'idVariante', 'quantidade', 'tamanho', 'cor']
const criar = handler(async (req, res) => {
    validarCampos(req.body, campos, ['idPedido', 'idProduto', 'quantidade'])
    const pedido = await editarPedido(id(req.body.idPedido), {}, false, req.usuario, itens => [...itens, req.body])
    const item = pedido.itensPedido.reduce((maior, atual) => !maior || atual.codItemPedido > maior.codItemPedido ? atual : maior, null)
    res.status(201).json({ item, pedido })
})

const salvar = completa => handler(async (req, res) => {
    validarCampos(req.body, campos, completa ? ['idPedido', 'idProduto', 'quantidade'] : [])
    const codigo = id(req.params.id)
    const referencia = await ItemPedido.findByPk(codigo)
    if (!referencia) falhar(404, 'Item do pedido não encontrado.')
    if (req.body.idPedido !== undefined && id(req.body.idPedido) !== referencia.idPedido) falhar(409, 'Não é permitido transferir itens entre pedidos.')
    const pedido = await editarPedido(referencia.idPedido, {}, false, req.usuario, itens => {
        if (!itens.some(item => item.codItemPedido === codigo)) falhar(404, 'Item do pedido não encontrado.')
        return itens.map(item => item.codItemPedido !== codigo ? item : completa
            ? { idVariante: null, tamanho: null, cor: null, ...req.body, codItemPedido: codigo }
            : { ...item, ...req.body })
    })
    res.json({ item: pedido.itensPedido.find(item => item.codItemPedido === codigo), pedido })
})
const atualizar = salvar(true)
const atualizarParcial = salvar(false)

const deletar = handler(async (req, res) => {
    const codigo = id(req.params.id)
    const referencia = await ItemPedido.findByPk(codigo)
    if (!referencia) falhar(404, 'Item do pedido não encontrado.')
    const pedido = await editarPedido(referencia.idPedido, {}, false, req.usuario, itens => {
        if (!itens.some(item => item.codItemPedido === codigo)) falhar(404, 'Item do pedido não encontrado.')
        return itens.filter(item => item.codItemPedido !== codigo)
    })
    res.json({ mensagem: 'Item excluído e totais recalculados.', pedido })
})

module.exports = { criar, listar, getById, buscarPorNome, atualizar, atualizarParcial, deletar }

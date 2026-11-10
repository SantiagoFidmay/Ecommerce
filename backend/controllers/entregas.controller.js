const { Op } = require('sequelize')
const { Entrega, Pedido, Usuario } = require('../models/rel')
const { handler, id, nomeBusca, falhar } = require('../utils/api.util')
const { salvarEntrega, excluirEntrega } = require('../services/entrega.service')

// GET /api/entregas/pedido/:pedido_id (privado)
const getByPedido = async (req, res) => {
    try {
        if (!/^[1-9]\d*$/.test(req.params.pedido_id) || Number(req.params.pedido_id) > 2147483647) {
            return res.status(400).json({ erro: 'Código de pedido inválido.' })
        }
        const entrega = await Entrega.findOne({
            where: { idPedido: req.params.pedido_id },
            include: [{ model: Pedido, as: 'pedidoEntrega' }]
        })
        if (!entrega) return res.status(404).json({ erro: 'Entrega não encontrada.' })
        if (req.usuario.tipo_usuario !== 'ADMIN' && entrega.pedidoEntrega.idUsuario !== req.usuario.codUsuario) {
            return res.status(403).json({ erro: 'Acesso negado.' })
        }
        return res.json(entrega)
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao buscar entrega.', detalhe: err.message })
    }
}

const criar = handler(async (req, res) => {
    res.status(201).json({ entrega: await salvarEntrega(req.body) })
})
const atualizar = handler(async (req, res) => {
    res.json({ entrega: await salvarEntrega(req.body, id(req.params.id), true) })
})
const atualizarParcial = handler(async (req, res) => {
    res.json({ entrega: await salvarEntrega(req.body, id(req.params.id)) })
})
const atualizarStatus = atualizarParcial
const deletar = handler(async (req, res) => {
    await excluirEntrega(id(req.params.id))
    res.json({ mensagem: 'Entrega excluída.' })
})
const getById = handler(async (req, res) => {
    const entrega = await Entrega.findByPk(id(req.params.id), { include: [{ model: Pedido, as: 'pedidoEntrega' }] })
    if (!entrega) falhar(404, 'Entrega não encontrada.')
    res.json(entrega)
})
const buscarPorNome = handler(async (req, res) => {
    const entregas = await Entrega.findAll({ include: [{ model: Pedido, as: 'pedidoEntrega', required: true, include: [{ model: Usuario, as: 'usuarioPedido', attributes: ['codUsuario', 'nome'], where: { nome: { [Op.like]: '%' + nomeBusca(req) + '%' } } }] }], order: [['codEntrega', 'DESC']] })
    res.json({ total: entregas.length, entregas })
})

// GET /api/entregas (admin)
const listar = async (req, res) => {
    try {
        const entregas = await Entrega.findAll({
            include: [{ model: Pedido, as: 'pedidoEntrega', attributes: ['codPedido', 'valorTotal', 'status', 'idUsuario'] }],
            order: [['codEntrega', 'DESC']]
        })
        return res.json({ total: entregas.length, entregas })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao listar entregas.', detalhe: err.message })
    }
}

module.exports = { criar, getById, buscarPorNome, getByPedido, atualizar, atualizarParcial, deletar, atualizarStatus, listar }

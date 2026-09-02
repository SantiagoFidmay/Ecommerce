const { Entrega, Pedido } = require('../models/rel')

// GET /api/entregas/pedido/:pedido_id (privado)
const getByPedido = async (req, res) => {
    try {
        const entrega = await Entrega.findOne({
            where: { idPedido: req.params.pedido_id },
            include: [{ model: Pedido, as: 'pedidoEntrega' }]
        })
        if (!entrega) return res.status(404).json({ erro: 'Entrega não encontrada.' })
        return res.json(entrega)
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao buscar entrega.', detalhe: err.message })
    }
}

// PATCH /api/entregas/:id/status (admin)
const atualizarStatus = async (req, res) => {
    try {
        const entrega = await Entrega.findByPk(req.params.id)
        if (!entrega) return res.status(404).json({ erro: 'Entrega não encontrada.' })

        const { status, codigo_rastreio, transportadora, data_previsao, data_entrega, observacoes } = req.body
        await entrega.update({ status, codigo_rastreio, transportadora, data_previsao, data_entrega, observacoes })

        return res.json({ mensagem: 'Status de entrega atualizado!', entrega })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao atualizar entrega.', detalhe: err.message })
    }
}

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

module.exports = { getByPedido, atualizarStatus, listar }

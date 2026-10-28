const { Entrega, Pedido } = require('../models/rel')

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

// PATCH /api/entregas/:id/status (admin)
const atualizarStatus = async (req, res) => {
    try {
        const entrega = await Entrega.findByPk(req.params.id)
        if (!entrega) return res.status(404).json({ erro: 'Entrega não encontrada.' })

        const { status, codigo_rastreio, transportadora, data_previsao, data_entrega, observacoes } = req.body
        const permitidos = ['PENDENTE','EM_TRANSITO','SAIU_PARA_ENTREGA','ENTREGUE','TENTATIVA_FALHA','DEVOLVIDO']
        if (!permitidos.includes(status)) return res.status(400).json({ erro: 'Status de entrega inválido.' })
        for (const [campo, valor, max] of [['rastreio', codigo_rastreio, 50], ['transportadora', transportadora, 100], ['observações', observacoes, 1000]]) {
            if (valor != null && (typeof valor !== 'string' || valor.length > max)) return res.status(400).json({ erro: `Campo ${campo} inválido.` })
        }
        for (const valor of [data_previsao, data_entrega]) if (valor && (!/^\d{4}-\d{2}-\d{2}$/.test(valor) || Number.isNaN(new Date(valor).getTime()) || new Date(valor).toISOString().slice(0,10) !== valor)) return res.status(400).json({ erro: 'Data inválida.' })
        const pedido = await Pedido.findByPk(entrega.idPedido)
        if (pedido.status === 'CANCELADO') return res.status(409).json({ erro: 'Não atualize a entrega de um pedido cancelado.' })
        if (['EM_TRANSITO','SAIU_PARA_ENTREGA','ENTREGUE'].includes(status) && !['ENVIADO','ENTREGUE'].includes(pedido.status)) return res.status(409).json({ erro: 'Marque o pedido como enviado antes de registrar a entrega.' })
        const db = require('../db/conn')
        await db.transaction(async transaction => {
            const atual = await Pedido.findByPk(entrega.idPedido, { transaction, lock: transaction.LOCK.UPDATE })
            if (atual.status === 'CANCELADO') throw Object.assign(new Error('Pedido cancelado.'), { status: 409 })
            await entrega.update({ status, codigo_rastreio, transportadora, data_previsao, data_entrega: status === 'ENTREGUE' ? data_entrega || new Date() : data_entrega, observacoes }, { transaction })
            if (status === 'ENTREGUE') await atual.update({ status: 'ENTREGUE' }, { transaction })
        })

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

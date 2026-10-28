const router = require('express').Router()
const db = require('../db/conn')
const { autenticar, apenasAdmin } = require('../middlewares/auth.middleware')
const { handler, id, falhar } = require('../utils/api.util')
const { Pedido, Pagamento, EventoPagamento, Reserva, Notificacao } = require('../models/rel')
const { liberarPedido } = require('../services/pedido.service')
router.get('/configuracao', (req, res) => res.json({ disponivel: true, modo: 'demonstracao', cobranca_real: false }))
router.post('/:id/demonstrar', autenticar, handler(async (req, res) => {
    if (req.body.confirmarDemonstracao !== true) falhar(400, 'Confirme que esta operação é uma demonstração sem cobrança.')
    const pagamento = await db.transaction(async transaction => {
        const pedido = await Pedido.findByPk(id(req.params.id), { transaction, lock: transaction.LOCK.UPDATE })
        if (!pedido || pedido.idUsuario !== req.usuario.codUsuario) falhar(404, 'Pedido não encontrado.')
        const pagamento = await Pagamento.findOne({ where: { idPedido: pedido.codPedido }, transaction, lock: transaction.LOCK.UPDATE })
        if (!pagamento || pagamento.provedor !== 'demonstracao') falhar(409, 'Pagamento não disponível para simulação.')
        if (pagamento.status === 'APROVADO') return pagamento
        const reserva = await Reserva.findByPk(pedido.codPedido, { transaction, lock: transaction.LOCK.UPDATE })
        if (pedido.status !== 'PENDENTE' || !reserva || reserva.status !== 'ATIVA' || reserva.expira_em <= new Date()) falhar(409, 'Este pedido não pode mais receber a confirmação de demonstração.')
        await pagamento.update({ status: 'APROVADO', atualizado_em: new Date() }, { transaction })
        await pedido.update({ status: 'CONFIRMADO' }, { transaction })
        await reserva.update({ status: 'CONSUMIDA' }, { transaction })
        await EventoPagamento.create({ idPagamento: pagamento.codPagamento, evento: 'SIMULACAO_APROVADA' }, { transaction })
        await Notificacao.create({ idUsuario: pedido.idUsuario, titulo: `Pedido #${pedido.codPedido} confirmado em demonstração`, mensagem: 'A simulação foi concluída. Nenhum valor foi cobrado.' }, { transaction })
        return pagamento
    })
    res.json({ pagamento, demonstracao: true, cobranca_real: false })
}))
router.post('/:id/reembolsar-demo', autenticar, apenasAdmin, handler(async (req, res) => {
    if (req.body.confirmarDemonstracao !== true) falhar(400, 'Confirme o estorno de demonstração.')
    const pagamento = await db.transaction(async transaction => {
        const pedido = await Pedido.findByPk(id(req.params.id), { transaction, lock: transaction.LOCK.UPDATE })
        if (!pedido) falhar(404, 'Pedido não encontrado.')
        const pagamento = await Pagamento.findOne({ where: { idPedido: pedido.codPedido }, transaction, lock: transaction.LOCK.UPDATE })
        if (pagamento?.status === 'REEMBOLSADO') return pagamento
        if (pagamento?.provedor !== 'demonstracao' || pagamento.status !== 'APROVADO') falhar(409, 'Não há pagamento de demonstração aprovado para estornar.')
        await pagamento.update({ status: 'REEMBOLSADO', atualizado_em: new Date() }, { transaction })
        await EventoPagamento.create({ idPagamento: pagamento.codPagamento, evento: 'SIMULACAO_ESTORNADA' }, { transaction })
        if (['PENDENTE', 'CONFIRMADO', 'EM_SEPARACAO'].includes(pedido.status)) await liberarPedido(pedido, 'Estorno de demonstração antes do envio.', transaction, req.usuario.codUsuario)
        res.statusCode = 200
        return pagamento
    })
    res.json({ pagamento, cobranca_real: false })
}))
module.exports = router

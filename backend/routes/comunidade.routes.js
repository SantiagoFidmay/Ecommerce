const router = require('express').Router()
const db = require('../db/conn')
const { Op } = require('sequelize')
const { Produto, Categoria, Estoque, Variante, Ficha, Marca, HistoricoPreco, Favorito, Alerta, Notificacao, Avaliacao, Pedido, ItemPedido, Usuario, Rotacao } = require('../models/rel')
const { autenticar } = require('../middlewares/auth.middleware')
const { handler, id, texto, falhar } = require('../utils/api.util')

router.get('/marcas', handler(async (req, res) => res.json({ marcas: await Marca.findAll({ order: [['ordem', 'ASC']] }) })))
router.get('/recomendar', handler(async (req, res) => {
    const orcamento = Number(req.query.orcamento)
    const uso = req.query.uso
    if (!Number.isFinite(orcamento) || orcamento <= 0 || orcamento > 100000 || !['DIARIO', 'VELOCIDADE', 'PROVA', 'ACADEMIA'].includes(uso)) falhar(400, 'Informe orçamento e finalidade válidos.')
    const produtos = await Produto.findAll({ where: { ativo: true }, include: [{ model: Ficha, as: 'fichaTecnica' }, { model: Estoque, as: 'estoqueProduto' }, { model: Categoria, as: 'categoriaProduto' }], limit: 500 })
    const resultados = produtos.filter(p => Number(p.preco_promocional ?? p.preco) <= orcamento && p.estoqueProduto?.quantidade > 0)
        .filter(p => !p.fichaTecnica?.dados?.finalidades?.length || p.fichaTecnica.dados.finalidades.includes(uso))
        .map(p => ({ produto: p, afinidade: p.fichaTecnica?.dados?.finalidades?.includes(uso) ? 1 : 0,
            motivos: [`Dentro do orçamento informado: R$ ${Number(p.preco_promocional ?? p.preco).toFixed(2).replace('.', ',')}.`,
                p.fichaTecnica?.dados?.finalidades?.includes(uso) ? 'Finalidade compatível com a ficha cadastrada e sua fonte.' : 'Finalidade técnica ainda não cadastrada: confira o review e compare antes de escolher.'] }))
        .sort((a, b) => b.afinidade - a.afinidade || Number(a.produto.preco_promocional ?? a.produto.preco) - Number(b.produto.preco_promocional ?? b.produto.preco))
    res.json({ resultados: resultados.slice(0, 6), criterio: 'Disponibilidade, orçamento e finalidade cadastrada. Dados desconhecidos não são inferidos.' })
}))
router.get('/produtos/:id/avaliacoes', handler(async (req, res) => {
    const avaliacoes = await Avaliacao.findAll({ where: { idProduto: id(req.params.id), visivel: true }, include: [{ model: Usuario, as: 'usuario', attributes: ['nome'] }], order: [['criado_em', 'DESC']], limit: 50 })
    res.json({ avaliacoes: avaliacoes.map(a => ({ codAvaliacao: a.codAvaliacao, nota: a.nota, comentario: a.comentario, ajuste: a.ajuste, uso: a.uso, criado_em: a.criado_em, autor: String(a.usuario.nome).split(' ')[0], compra_verificada: true })) })
}))

router.use(autenticar)
router.get('/favoritos', handler(async (req, res) => res.json({ favoritos: await Favorito.findAll({ where: { idUsuario: req.usuario.codUsuario }, include: [{ model: Produto, as: 'produto', include: [{ model: Estoque, as: 'estoqueProduto' }] }], order: [['criado_em', 'DESC']] }) })))
router.put('/favoritos/:id', handler(async (req, res) => {
    const idProduto = id(req.params.id)
    if (!await Produto.findOne({ where: { codProduto: idProduto, ativo: true } })) falhar(404, 'Produto não encontrado.')
    await Favorito.findOrCreate({ where: { idUsuario: req.usuario.codUsuario, idProduto } })
    res.json({ salvo: true })
}))
router.delete('/favoritos/:id', handler(async (req, res) => {
    await Favorito.destroy({ where: { idUsuario: req.usuario.codUsuario, idProduto: id(req.params.id) } })
    res.json({ salvo: false })
}))
router.get('/alertas', handler(async (req, res) => res.json({ alertas: await Alerta.findAll({ where: { idUsuario: req.usuario.codUsuario, ativo: true }, include: [{ model: Variante, as: 'variante', include: [{ model: Produto, as: 'produto' }] }] }) })))
router.put('/alertas/:id', handler(async (req, res) => {
    const referencia = await Variante.findByPk(id(req.params.id))
    if (!referencia) falhar(404, 'Opção não encontrada.')
    const alerta = await db.transaction(async transaction => {
        const produto = await Produto.findByPk(referencia.idProduto, { transaction, lock: transaction.LOCK.UPDATE })
        const variante = await Variante.findByPk(referencia.codVariante, { transaction, lock: transaction.LOCK.UPDATE })
        if (!produto?.ativo || !variante.ativo) falhar(404, 'Opção não encontrada.')
        if (variante.quantidade > 0) falhar(409, 'Esta opção já está disponível.')
        const [registro] = await Alerta.findOrCreate({ where: { idUsuario: req.usuario.codUsuario, idVariante: variante.codVariante }, transaction })
        await registro.update({ ativo: true }, { transaction })
        return registro
    })
    res.json({ alerta })
}))
router.delete('/alertas/:id', handler(async (req, res) => {
    await Alerta.update({ ativo: false }, { where: { idUsuario: req.usuario.codUsuario, idVariante: id(req.params.id) } })
    res.json({ removido: true })
}))
router.get('/notificacoes', handler(async (req, res) => res.json({ notificacoes: await Notificacao.findAll({ where: { idUsuario: req.usuario.codUsuario }, order: [['codNotificacao', 'DESC']], limit: 100 }) })))
router.patch('/notificacoes/:id', handler(async (req, res) => {
    await Notificacao.update({ lida: true }, { where: { codNotificacao: id(req.params.id), idUsuario: req.usuario.codUsuario } })
    res.json({ lida: true })
}))
router.post('/produtos/:id/avaliacoes', handler(async (req, res) => {
    const idProduto = id(req.params.id), idPedido = id(req.body.idPedido)
    const pedido = await Pedido.findOne({ where: { codPedido: idPedido, idUsuario: req.usuario.codUsuario, status: 'ENTREGUE' } })
    if (!pedido || !await ItemPedido.findOne({ where: { idPedido, idProduto } })) falhar(403, 'Avalie somente produtos de pedidos seus que já foram entregues.')
    const nota = req.body.nota, ajuste = req.body.ajuste
    if (!Number.isSafeInteger(nota) || nota < 1 || nota > 5 || !['PEQUENO', 'ADEQUADO', 'GRANDE'].includes(ajuste)) falhar(400, 'Informe uma nota de 1 a 5 e o ajuste do tênis.')
    const comentario = texto(req.body.comentario, 1000, true), uso = texto(req.body.uso || '', 80)
    const [avaliacao, criada] = await Avaliacao.findOrCreate({ where: { idUsuario: req.usuario.codUsuario, idProduto, idPedido }, defaults: { nota, ajuste, comentario, uso } })
    if (!criada) falhar(409, 'Você já avaliou este produto neste pedido.')
    res.status(201).json({ avaliacao })
}))
router.get('/rotacao', handler(async (req, res) => res.json({ rotacao: await Rotacao.findAll({ where: { idUsuario: req.usuario.codUsuario }, include: [{ model: Produto, as: 'produto' }] }) })))
router.put('/rotacao/:id', handler(async (req, res) => {
    const idProduto = id(req.params.id)
    if (!['DIARIO', 'VELOCIDADE', 'PROVA'].includes(req.body.uso)) falhar(400, 'Uso inválido.')
    if (!await Produto.findByPk(idProduto)) falhar(404, 'Produto não encontrado.')
    const [registro] = await Rotacao.findOrCreate({ where: { idUsuario: req.usuario.codUsuario, idProduto }, defaults: { uso: req.body.uso } })
    await registro.update({ uso: req.body.uso })
    res.json({ registro })
}))
router.delete('/rotacao/:id', handler(async (req, res) => { await Rotacao.destroy({ where: { idUsuario: req.usuario.codUsuario, idProduto: id(req.params.id) } }); res.json({ removido: true }) }))
module.exports = router

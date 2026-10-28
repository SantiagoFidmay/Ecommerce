const router = require('express').Router()
const { Op } = require('sequelize')
const db = require('../db/conn')
const { autenticar, apenasAdmin } = require('../middlewares/auth.middleware')
const { Produto, Categoria, Estoque, Variante, Midia, Ficha, Movimento, Pedido, ItemPedido, Usuario, Entrega, Pagamento, Marca, Avaliacao } = require('../models/rel')
const { handler, id, texto, falhar, urlPublica } = require('../utils/api.util')
const { salvarProduto } = require('../services/produto.service')
const { movimentarVariante, saldoProduto } = require('../services/estoque.service')
const { expirarReservas } = require('../services/pedido.service')

router.use(autenticar, apenasAdmin)
router.get('/categorias', handler(async (req, res) => res.json({ categorias: await Categoria.findAll({ order: [['nome', 'ASC']] }) })))
router.get('/usuarios', handler(async (req, res) => res.json({ usuarios: await Usuario.findAll({ attributes: { exclude: ['senha'] }, order: [['codUsuario', 'DESC']], limit: 100 }) })))
router.patch('/usuarios/:id/acesso', handler(async (req, res) => {
    const codigo = id(req.params.id)
    const usuario = await require('../services/acesso.service').alterarAcesso(codigo, req.usuario, req.body)
    res.json({ usuario })
}))
router.post('/categorias', handler(async (req, res) => {
    const categoria = await Categoria.create({ nome: texto(req.body.nome, 80, true), descricao: texto(req.body.descricao || '', 2000), icone: texto(req.body.icone || '', 50) })
    res.status(201).json({ categoria })
}))
router.patch('/categorias/:id', handler(async (req, res) => {
    const categoria = await Categoria.findByPk(id(req.params.id))
    if (!categoria) falhar(404, 'Categoria não encontrada.')
    const dados = {}
    for (const [campo, limite] of [['nome', 80], ['descricao', 2000], ['icone', 50]]) if (req.body[campo] !== undefined) dados[campo] = texto(req.body[campo], limite, campo === 'nome')
    if (req.body.ativo !== undefined) {
        if (typeof req.body.ativo !== 'boolean') falhar(400, 'Disponibilidade inválida.')
        if (!req.body.ativo && await Produto.count({ where: { idCategoria: categoria.codCategoria, ativo: true } })) falhar(409, 'Desative os produtos dessa categoria antes de desativá-la.')
        dados.ativo = req.body.ativo
    }
    await categoria.update(dados); res.json({ categoria })
}))
router.get('/produtos', handler(async (req, res) => {
    const busca = String(req.query.busca || '').slice(0, 100)
    const produtos = await Produto.findAll({ where: busca ? { nome: { [Op.like]: `%${busca}%` } } : {},
        include: [{ model: Categoria, as: 'categoriaProduto' }, { model: Estoque, as: 'estoqueProduto' }, { model: Variante, as: 'variantes' }, { model: Midia, as: 'midias' }, { model: Ficha, as: 'fichaTecnica' }], order: [['codProduto', 'DESC']], limit: 100 })
    res.json({ produtos })
}))
router.post('/produtos', handler(async (req, res) => res.status(201).json({ produto: await salvarProduto(req.body) })))
router.patch('/produtos/:id', handler(async (req, res) => res.json({ produto: await salvarProduto(req.body, id(req.params.id)) })))
router.post('/produtos/:id/variantes', handler(async (req, res) => {
    const idProduto = id(req.params.id)
    const tamanho = texto(req.body.tamanho, 20, true), cor = texto(req.body.cor, 50, true), sku = texto(req.body.sku, 80, true)
    const minimo = req.body.quantidade_minima ?? 2
    if (!Number.isSafeInteger(minimo) || minimo < 0 || minimo > 1000000) falhar(400, 'Estoque mínimo inválido.')
    const variante = await db.transaction(async transaction => {
        if (!await Produto.findByPk(idProduto, { transaction, lock: transaction.LOCK.UPDATE })) falhar(404, 'Produto não encontrado.')
        const [estoque] = await Estoque.findOrCreate({ where: { idProduto }, defaults: { quantidade: 0 }, transaction })
        if (estoque.quantidade > 0 && !await Variante.count({ where: { idProduto }, transaction })) {
            await Variante.create({ idProduto, tamanho: 'Não informado', cor: 'Original', sku: `LEGADO-${idProduto}`, quantidade: estoque.quantidade, legado: true }, { transaction })
        }
        const registro = await Variante.create({ idProduto, tamanho, cor, sku, quantidade: 0, quantidade_minima: minimo }, { transaction })
        await saldoProduto(idProduto, transaction)
        return registro
    })
    res.status(201).json({ variante })
}))
router.patch('/variantes/:id', handler(async (req, res) => {
    if (typeof req.body.ativo !== 'boolean') falhar(400, 'Informe a disponibilidade da opção.')
    const variante = await db.transaction(async transaction => {
        const referencia = await Variante.findByPk(id(req.params.id), { transaction })
        if (!referencia) falhar(404, 'Opção não encontrada.')
        await Produto.findByPk(referencia.idProduto, { transaction, lock: transaction.LOCK.UPDATE })
        await Estoque.findOne({ where: { idProduto: referencia.idProduto }, transaction, lock: transaction.LOCK.UPDATE })
        const registro = await Variante.findByPk(referencia.codVariante, { transaction, lock: transaction.LOCK.UPDATE })
        if (!req.body.ativo && registro.quantidade > 0) falhar(409, 'Zere ou transfira o saldo antes de desativar a opção.')
        await registro.update({ ativo: req.body.ativo }, { transaction })
        await saldoProduto(registro.idProduto, transaction)
        return registro
    })
    res.json({ variante })
}))
router.post('/variantes/:id/movimentos', handler(async (req, res) => res.json({ variante: await movimentarVariante(id(req.params.id), req.body, req.usuario.codUsuario) })))
router.get('/movimentos', handler(async (req, res) => res.json({ movimentos: await Movimento.findAll({ where: req.query.produto ? { idProduto: id(req.query.produto) } : {}, include: [{ model: Produto, as: 'produto', attributes: ['nome'] }], order: [['codMovimento', 'DESC']], limit: 100 }) })))
router.get('/pedidos', handler(async (req, res) => res.json({ pedidos: await Pedido.findAll({ include: [
    { model: Usuario, as: 'usuarioPedido', attributes: ['nome', 'email'] }, { model: Entrega, as: 'entregaPedido' },
    { model: Pagamento, as: 'pagamentoPedido', attributes: ['status', 'provedor', 'valor'] }
], order: [['codPedido', 'DESC']], limit: 100 }) })))
router.post('/reservas/expirar', handler(async (req, res) => res.json({ cancelados: await expirarReservas() })))
router.get('/marcas', handler(async (req, res) => res.json({ marcas: await Marca.findAll({ order: [['ordem', 'ASC']] }) })))
router.patch('/marcas/:id', handler(async (req, res) => {
    const marca = await Marca.findByPk(id(req.params.id))
    if (!marca) falhar(404, 'Marca não encontrada.')
    const dados = {}
    for (const campo of ['descricao', 'site_url', 'contato_url']) if (req.body[campo] !== undefined) dados[campo] = campo.endsWith('_url') ? urlPublica(req.body[campo]) : texto(req.body[campo], 2000)
    await marca.update(dados)
    res.json({ marca })
}))
router.get('/avaliacoes', handler(async (req, res) => res.json({ avaliacoes: await Avaliacao.findAll({ include: [{ model: Produto, as: 'produto', attributes: ['nome'] }], order: [['codAvaliacao', 'DESC']], limit: 100 }) })))
router.patch('/avaliacoes/:id', handler(async (req, res) => {
    if (typeof req.body.visivel !== 'boolean') falhar(400, 'Visibilidade inválida.')
    const registro = await Avaliacao.findByPk(id(req.params.id))
    if (!registro) falhar(404, 'Avaliação não encontrada.')
    await registro.update({ visivel: req.body.visivel })
    res.json({ avaliacao: registro })
}))
module.exports = router

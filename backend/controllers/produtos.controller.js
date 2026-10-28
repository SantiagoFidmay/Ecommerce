const { Op, literal, fn, col }  = require('sequelize')
const { Produto, Categoria, Estoque, Variante, Midia, Ficha, Avaliacao, HistoricoPreco } = require('../models/rel')

// GET /api/produtos (público)
const listar = async (req, res) => {
    try {
        const { categoria_id, busca, destaque, preco_max, ordem = 'recomendados', pagina = 1, limite = 20 } = req.query
        const numeroPagina = Number(pagina)
        const tamanhoPagina = Number(limite)
        if (!Number.isSafeInteger(numeroPagina) || numeroPagina < 1 ||
            !Number.isSafeInteger(tamanhoPagina) || tamanhoPagina < 1 || tamanhoPagina > 100) {
            return res.status(400).json({ erro: 'Página e limite devem ser inteiros positivos; limite máximo de 100.' })
        }
        const where = { ativo: true }
        const precoEfetivo = literal('COALESCE(`produto`.`preco_promocional`, `produto`.`preco`)')
        if (preco_max !== undefined) {
            const valorMaximo = Number(preco_max)
            if (!Number.isFinite(valorMaximo) || valorMaximo < 0) {
                return res.status(400).json({ erro: 'Preço máximo inválido.' })
            }
            where[Op.and] = [require('sequelize').where(precoEfetivo, { [Op.lte]: valorMaximo })]
        }
        const ordenacoes = {
            // Ordem estável com alternância entre marcas, sem repetir itens entre páginas.
            recomendados: [[literal('(SELECT COUNT(*) FROM produtos similares WHERE similares.ativo=1 AND similares.marca=produto.marca AND similares.codProduto<produto.codProduto)'), 'ASC'], ['marca', 'ASC'], ['codProduto', 'ASC']],
            recent: [['codProduto', 'DESC']],
            nome: [['nome', 'ASC'], ['codProduto', 'ASC']],
            preco_asc: [[precoEfetivo, 'ASC'], ['codProduto', 'ASC']],
            preco_desc: [[precoEfetivo, 'DESC'], ['codProduto', 'ASC']]
        }

        if (categoria_id) where.idCategoria = categoria_id
        if (req.query.marca) where.marca = String(req.query.marca).slice(0, 80)
        if (destaque === 'true') where.destaque = true
        if (busca) {
            where[Op.or] = [
                { nome:    { [Op.like]: `%${busca}%` } },
                { marca:   { [Op.like]: `%${busca}%` } },
                { codigo_produto: { [Op.like]: `%${busca}%` } }
            ]
        }

        const offset = (numeroPagina - 1) * tamanhoPagina

        const { count, rows } = await Produto.findAndCountAll({
            where,
            include: [
                { model: Categoria, as: 'categoriaProduto', attributes: ['codCategoria', 'nome', 'icone'] },
                { model: Estoque, as: 'estoqueProduto', attributes: ['quantidade', 'quantidade_minima'] },
                { model: Ficha, as: 'fichaTecnica' }
            ],
            order: Object.hasOwn(ordenacoes, ordem) ? ordenacoes[ordem] : ordenacoes.recomendados,
            limit: tamanhoPagina,
            offset
        })

        return res.json({
            total:       count,
            pagina: numeroPagina,
            totalPaginas: Math.ceil(count / tamanhoPagina),
            produtos:    rows
        })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao listar produtos.', detalhe: err.message })
    }
}

// GET /api/produtos/:id (público)
const getById = async (req, res) => {
    try {
        const produto = await Produto.findOne({
            where: { codProduto: req.params.id, ativo: true },
            include: [
                { model: Categoria, as: 'categoriaProduto' },
                { model: Estoque, as: 'estoqueProduto' },
                { model: Variante, as: 'variantes', where: { ativo: true }, required: false },
                { model: Midia, as: 'midias' },
                { model: Ficha, as: 'fichaTecnica' }
            ]
        })
        if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' })
        const [estatisticas] = await Avaliacao.findAll({ where: { idProduto: produto.codProduto, visivel: true }, attributes: [[fn('COUNT', col('codAvaliacao')), 'total'], [fn('AVG', col('nota')), 'media']], raw: true })
        const historico = await HistoricoPreco.findAll({ where: { idProduto: produto.codProduto }, order: [['criado_em', 'DESC']], limit: 30, attributes: ['preco', 'criado_em'] })
        return res.json({ ...produto.toJSON(), avaliacoes: { total: Number(estatisticas.total), media: estatisticas.media ? Number(estatisticas.media) : null }, historicoPrecos: historico })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao buscar produto.', detalhe: err.message })
    }
}

// GET /api/produtos/buscar?nome=... (público)
const buscar = async (req, res) => {
    try {
        const { nome, categoria, marca } = req.query
        const where = { ativo: true }
        if (nome)  where.nome  = { [Op.like]: `%${nome}%` }
        if (marca) where.marca = { [Op.like]: `%${marca}%` }

        const includeOpts = [
            { model: Categoria, as: 'categoriaProduto', attributes: ['codCategoria', 'nome', 'icone'] },
            { model: Estoque,   as: 'estoqueProduto',   attributes: ['quantidade'] }
        ]
        if (categoria) includeOpts[0].where = { nome: { [Op.like]: `%${categoria}%` } }

        const produtos = await Produto.findAll({ where, include: includeOpts })
        return res.json({ total: produtos.length, produtos })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao buscar produtos.', detalhe: err.message })
    }
}

const { salvarProduto } = require('../services/produto.service')
const { handler, id } = require('../utils/api.util')
const criar = handler(async (req, res) => res.status(201).json({ produto: await salvarProduto(req.body) }))
const atualizar = handler(async (req, res) => res.json({ produto: await salvarProduto(req.body, id(req.params.id)) }))
const atualizarParcial = atualizar
const deletar = handler(async (req, res) => res.json({ produto: await salvarProduto({ ativo: false }, id(req.params.id)) }))
module.exports = { listar, getById, buscar, criar, atualizar, atualizarParcial, deletar }

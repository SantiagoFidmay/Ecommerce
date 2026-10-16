const { Op, literal }  = require('sequelize')
const { Produto, Categoria, Estoque } = require('../models/rel')

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
            // Mistura estável: o preço tem maior peso, sem repetir itens entre páginas.
            recomendados: [[literal('COALESCE(`produto`.`preco_promocional`, `produto`.`preco`) * (0.7 + MOD(CRC32(CONCAT(\'sport-kicks-\', `produto`.`codProduto`)), 1000) / 1665.0)'), 'DESC'], ['codProduto', 'ASC']],
            recent: [['codProduto', 'DESC']],
            nome: [['nome', 'ASC'], ['codProduto', 'ASC']],
            preco_asc: [[precoEfetivo, 'ASC'], ['codProduto', 'ASC']],
            preco_desc: [[precoEfetivo, 'DESC'], ['codProduto', 'ASC']]
        }

        if (categoria_id) where.idCategoria = categoria_id
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
                { model: Estoque,   as: 'estoqueProduto',   attributes: ['quantidade', 'quantidade_minima'] }
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
                { model: Estoque,   as: 'estoqueProduto'   }
            ]
        })
        if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' })
        return res.json(produto)
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

// POST /api/produtos (admin)
const criar = async (req, res) => {
    try {
        const { nome, descricao, preco, preco_promocional, imagem_url, video_url, tamanhos_disponiveis, cores, marca, codigo_produto, idCategoria, destaque } = req.body

        if (!nome || !preco || !idCategoria) {
            return res.status(400).json({ erro: 'Nome, preço e categoria são obrigatórios.' })
        }

        const categoriaExiste = await Categoria.findByPk(idCategoria)
        if (!categoriaExiste) return res.status(404).json({ erro: 'Categoria não encontrada.' })

        const produto = await Produto.create({
            nome, descricao, preco, preco_promocional, imagem_url, video_url,
            tamanhos_disponiveis, cores, marca, codigo_produto, idCategoria, destaque
        })

        // Cria estoque zerado automaticamente
        await Estoque.create({ idProduto: produto.codProduto, quantidade: 0 })

        return res.status(201).json({ mensagem: 'Produto cadastrado com sucesso!', produto })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao cadastrar produto.', detalhe: err.message })
    }
}

// PUT /api/produtos/:id (admin)
const atualizar = async (req, res) => {
    try {
        const produto = await Produto.findByPk(req.params.id)
        if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' })
        await produto.update(req.body)
        return res.json({ mensagem: 'Produto atualizado com sucesso!', produto })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao atualizar produto.', detalhe: err.message })
    }
}

// PATCH /api/produtos/:id (admin)
const atualizarParcial = async (req, res) => {
    try {
        const produto = await Produto.findByPk(req.params.id)
        if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' })

        const camposPermitidos = ['nome', 'descricao', 'preco', 'preco_promocional', 'imagem_url', 'marca', 'destaque', 'ativo']
        const atualizacoes = {}
        camposPermitidos.forEach(c => { if (req.body[c] !== undefined) atualizacoes[c] = req.body[c] })

        await produto.update(atualizacoes)
        return res.json({ mensagem: 'Produto atualizado com sucesso!' })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao atualizar produto.', detalhe: err.message })
    }
}

// DELETE /api/produtos/:id (admin — soft delete)
const deletar = async (req, res) => {
    try {
        const produto = await Produto.findByPk(req.params.id)
        if (!produto) return res.status(404).json({ erro: 'Produto não encontrado.' })
        await produto.update({ ativo: false })
        return res.json({ mensagem: 'Produto removido com sucesso.' })
    } catch (err) {
        return res.status(500).json({ erro: 'Erro ao remover produto.', detalhe: err.message })
    }
}

module.exports = { listar, getById, buscar, criar, atualizar, atualizarParcial, deletar }

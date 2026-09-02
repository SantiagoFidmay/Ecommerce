const { Op }  = require('sequelize')
const { Produto, Categoria, Estoque } = require('../models/rel')

// GET /api/produtos (público)
const listar = async (req, res) => {
    try {
        const { categoria_id, busca, destaque, pagina = 1, limite = 20 } = req.query
        const where = { ativo: true }

        if (categoria_id) where.idCategoria = categoria_id
        if (destaque === 'true') where.destaque = true
        if (busca) {
            where[Op.or] = [
                { nome:    { [Op.like]: `%${busca}%` } },
                { marca:   { [Op.like]: `%${busca}%` } },
                { codigo_produto: { [Op.like]: `%${busca}%` } }
            ]
        }

        const offset = (parseInt(pagina) - 1) * parseInt(limite)

        const { count, rows } = await Produto.findAndCountAll({
            where,
            include: [
                { model: Categoria, as: 'categoriaProduto', attributes: ['codCategoria', 'nome', 'icone'] },
                { model: Estoque,   as: 'estoqueProduto',   attributes: ['quantidade', 'quantidade_minima'] }
            ],
            order: [['nome', 'ASC']],
            limit:  parseInt(limite),
            offset
        })

        return res.json({
            total:       count,
            pagina:      parseInt(pagina),
            totalPaginas: Math.ceil(count / parseInt(limite)),
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

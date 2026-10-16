require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true })
const db = require('../db/conn')
const { Produto, Categoria, Estoque } = require('../models/rel')

const modelos = [
    { nome: 'Adizero Boston 13', preco: '1099.90', preco_promocional: '899.90', codigo_produto: 'BOSTON-13', imagem: 'boston13-1.webp', categoria: 'Corrida' },
    { nome: 'Adizero Adios Pro 4', preco: '1599.90', codigo_produto: 'ADIOS-PRO-4', imagem: 'adiospro1.avif', categoria: 'Corrida' },
    { nome: 'Hyperboost Edge', preco: '799.90', preco_promocional: '699.90', codigo_produto: 'HYPERBOOST-EDGE', imagem: 'hyperboostEdge1.avif', categoria: 'Treino' },
    { nome: 'Adizero EVO SL', preco: '1099.00', codigo_produto: 'EVO-SL', imagem: 'evosl1.avif', categoria: 'Corrida' },
    { nome: 'Adizero Adios Pro 5', preco: '2199.00', codigo_produto: 'ADIOS-PRO-5', imagem: 'adiospro5-1.avif', categoria: 'Corrida' }
]

async function preparar() {
    try {
        db.options.logging = false
        await db.transaction(async transaction => {
            for (const modelo of modelos) {
                const [categoria] = await Categoria.findOrCreate({ where: { nome: modelo.categoria }, transaction })
                let produto = await Produto.findOne({ where: { codigo_produto: modelo.codigo_produto }, transaction })
                if (!produto) produto = await Produto.findOne({ where: { nome: modelo.nome }, transaction })
                if (!produto) {
                    produto = await Produto.create({
                        nome: modelo.nome, preco: modelo.preco, preco_promocional: modelo.preco_promocional || null,
                        codigo_produto: modelo.codigo_produto, marca: 'Adidas',
                        imagem_url: `../../imagens/${modelo.imagem}`, idCategoria: categoria.codCategoria,
                        ativo: true, destaque: true
                    }, { transaction })
                } else {
                    await produto.update({ ativo: true, destaque: true }, { transaction })
                }
            }
            // Inclui também outros produtos já cadastrados, sem reduzir estoques maiores.
            for (const produto of await Produto.findAll({ transaction })) {
                await produto.update({ ativo: true }, { transaction })
                const [estoque] = await Estoque.findOrCreate({
                    where: { idProduto: produto.codProduto }, defaults: { quantidade: 20 }, transaction
                })
                if (estoque.quantidade < 20) await estoque.update({ quantidade: 20 }, { transaction })
            }
        })
        const produtos = await Produto.findAll({ include: [{ model: Estoque, as: 'estoqueProduto' }], order: [['codProduto', 'ASC']] })
        console.log(JSON.stringify(produtos.map(p => ({ id: p.codProduto, nome: p.nome, quantidade: p.estoqueProduto.quantidade }))))
    } catch (erro) {
        console.error(erro.message)
        process.exitCode = 1
    } finally {
        await db.close()
    }
}
preparar()

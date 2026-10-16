require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true })
const db = require('../db/conn')
const { Categoria, Produto, Estoque } = require('../models/rel')
const modelos = [
    { nome: 'Olympikus Corre 5', codigo: 'OLYMPIKUS-CORRE-5', preco: '599.00', imagem: 'corre5-1.webp' },
    { nome: 'Olympikus Turbo', codigo: 'OLYMPIKUS-TURBO', preco: '699.00', imagem: 'turbo1.webp' },
    { nome: 'Olympikus Supra', codigo: 'OLYMPIKUS-SUPRA', preco: '1299.00', imagem: 'supra1.webp' }
]

async function cadastrar() {
    try {
        db.options.logging = false
        await db.transaction(async transaction => {
            const [categoria] = await Categoria.findOrCreate({ where: { nome: 'Corrida' }, transaction })
            for (const modelo of modelos) {
                const [produto] = await Produto.findOrCreate({
                    where: { codigo_produto: modelo.codigo },
                    defaults: {
                        nome: modelo.nome, marca: 'Olympikus', preco: modelo.preco,
                        imagem_url: `../../imagens/${modelo.imagem}`,
                        idCategoria: categoria.codCategoria, ativo: true, destaque: true
                    }, transaction
                })
                const [estoque] = await Estoque.findOrCreate({
                    where: { idProduto: produto.codProduto }, defaults: { quantidade: 20 }, transaction
                })
                if (estoque.quantidade < 20) await estoque.update({ quantidade: 20 }, { transaction })
                console.log(JSON.stringify({ id: produto.codProduto, nome: produto.nome, preco: produto.preco, estoque: estoque.quantidade }))
            }
        })
    } catch (erro) {
        console.error(erro.message)
        process.exitCode = 1
    } finally {
        await db.close()
    }
}
cadastrar()

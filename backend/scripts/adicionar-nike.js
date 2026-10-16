require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true })
const db = require('../db/conn')
const { Categoria, Produto, Estoque } = require('../models/rel')
const modelos = ['vaporfly', 'alphafly', 'vomero']

async function cadastrar() {
    try {
        const precos = JSON.parse(process.argv[2] || '{}')
        for (const modelo of modelos) {
            if (typeof precos[modelo] !== 'number' || !Number.isFinite(precos[modelo]) || precos[modelo] <= 0) {
                throw new Error(`Informe um preço positivo para ${modelo}. Nenhum produto foi alterado.`)
            }
        }
        db.options.logging = false
        await db.transaction(async transaction => {
            const [categoria] = await Categoria.findOrCreate({ where: { nome: 'Corrida' }, transaction })
            for (const modelo of modelos) {
                const [produto] = await Produto.findOrCreate({
                    where: { codigo_produto: `NIKE-${modelo.toUpperCase()}` },
                    defaults: {
                        nome: `Nike ${modelo[0].toUpperCase()}${modelo.slice(1)}`,
                        marca: 'Nike', preco: precos[modelo].toFixed(2),
                        imagem_url: `../../imagens/${modelo}1.avif`,
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

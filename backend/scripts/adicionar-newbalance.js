require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true })
const db = require('../db/conn')
const { Categoria, Produto, Estoque } = require('../models/rel')
const modelos = [
    { chave: 'rebel', nome: 'New Balance Rebel v5', codigo: 'NB-REBEL-V5', imagem: 'rebelv5-1.webp' },
    { chave: '1080', nome: 'New Balance 1080 v15', codigo: 'NB-1080-V15', imagem: '1080v15-1.webp' },
    { chave: 'supercomp', nome: 'New Balance SuperComp', codigo: 'NB-SUPERCOMP', imagem: 'supercomp.webp' }
]

async function cadastrar() {
    try {
        const precos = JSON.parse(process.argv[2] || '{}')
        for (const modelo of modelos) {
            const preco = precos[modelo.chave]
            if (typeof preco !== 'number' || !Number.isFinite(preco) || preco <= 0) {
                throw new Error(`Informe um preço positivo para ${modelo.nome}. Nenhum produto foi alterado.`)
            }
        }
        db.options.logging = false
        await db.transaction(async transaction => {
            const [categoria] = await Categoria.findOrCreate({ where: { nome: 'Corrida' }, transaction })
            for (const modelo of modelos) {
                const [produto] = await Produto.findOrCreate({
                    where: { codigo_produto: modelo.codigo },
                    defaults: {
                        nome: modelo.nome, marca: 'New Balance', preco: precos[modelo.chave].toFixed(2),
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

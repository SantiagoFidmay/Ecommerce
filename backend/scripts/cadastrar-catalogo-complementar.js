require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true })
const db = require('../db/conn')
const { Produto, Categoria, Estoque } = require('../models/rel')

// Nomes e preços informados pelo responsável pela loja.
const modelos = [
    ['ASICS-SUPERBLAST', 'ASICS Superblast 3', 'Asics', '1699.99', 'superblast1.webp'],
    ['ASICS-NOVABLAST', 'ASICS Novablast 6', 'Asics', '999.99', 'novablast1.webp'],
    ['ASICS-METASPEED', 'ASICS Metaspeed Tokyo (Sky/Edge)', 'Asics', '2299.99', 'metaspeed1.webp'],
    ['ASICS-MEGABLAST', 'ASICS Megablast', 'Asics', '1999.99', 'megablast.webp'],
    ['NB-REBEL-V5', 'New Balance Rebel v5', 'New Balance', '999.99', 'rebelv5-1.webp'],
    ['NB-1080-V15', 'New Balance 1080 v15', 'New Balance', '1199.99', '1080v15-1.webp'],
    ['NB-SUPERCOMP', 'New Balance SuperComp Elite v6', 'New Balance', '2299.99', 'supercomp.webp'],
    ['NIKE-VAPORFLY', 'Nike Vaporfly 4', 'Nike', '2299.99', 'vaporfly1.avif'],
    ['NIKE-ALPHAFLY', 'Nike Alphafly 3', 'Nike', '2299.99', 'alphafly1.avif'],
    ['NIKE-VOMERO', 'Nike Vomero Plus', 'Nike', '1299.99', 'vomero1.avif']
]

async function cadastrar() {
    db.options.logging = false
    try {
        await db.transaction(async transaction => {
            const [categoria] = await Categoria.findOrCreate({ where: { nome: 'Corrida' }, transaction })
            for (const [codigo_produto, nome, marca, preco, imagem] of modelos) {
                const dados = {
                    nome, marca, preco, preco_promocional: null,
                    imagem_url: `../../imagens/${imagem}`,
                    idCategoria: categoria.codCategoria, ativo: true, destaque: true
                }
                const [produto, criado] = await Produto.findOrCreate({
                    where: { codigo_produto }, defaults: dados, transaction
                })
                if (!criado) await produto.update(dados, { transaction })
                // Segue o estoque de demonstração dos demais scripts, preservando estoques existentes.
                await Estoque.findOrCreate({
                    where: { idProduto: produto.codProduto }, defaults: { quantidade: 20 }, transaction
                })
            }
        })
        console.log('Dez modelos cadastrados com os nomes e preços informados.')
        console.log(`Total de produtos ativos: ${await Produto.count({ where: { ativo: true } })}`)
    } catch (erro) {
        console.error(erro.message)
        process.exitCode = 1
    } finally {
        await db.close()
    }
}

cadastrar()

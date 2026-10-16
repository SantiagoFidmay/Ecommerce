require('dotenv').config({ path: require('path').join(__dirname, '..', '.env'), quiet: true })
const db = require('../db/conn')
const { Categoria, Produto, Estoque } = require('../models/rel')

async function cadastrar() {
    try {
        await db.transaction(async transaction => {
            const [categoria] = await Categoria.findOrCreate({
                where: { nome: 'Corrida' },
                defaults: { descricao: 'Tênis de corrida' },
                transaction
            })
            const [produto, criado] = await Produto.findOrCreate({
                where: { codigo_produto: 'ADIOS-PRO-5' },
                defaults: {
                    nome: 'Adizero Adios Pro 5',
                    marca: 'Adidas',
                    preco: '2199.00',
                    descricao: 'Adizero Adios Pro 5. Confira os detalhes do modelo na galeria de imagens.',
                    imagem_url: '../../imagens/adiospro5-1.avif',
                    idCategoria: categoria.codCategoria,
                    destaque: true,
                    ativo: true
                },
                transaction
            })
            await Estoque.findOrCreate({
                where: { idProduto: produto.codProduto },
                defaults: { quantidade: 0 },
                transaction
            })
            console.log(JSON.stringify({ criado, id: produto.codProduto, nome: produto.nome, preco: produto.preco }))
        })
    } catch (erro) {
        console.error('Não foi possível cadastrar o Adios Pro 5:', erro.message)
        process.exitCode = 1
    } finally {
        await db.close()
    }
}

cadastrar()

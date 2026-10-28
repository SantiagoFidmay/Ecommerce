const db = require('../db/conn')
const { Produto, Categoria, Marca, Estoque, Variante, Midia, HistoricoPreco } = require('../models/rel')
const { migrar } = require('../migrations')
const { reviews } = require('../data/catalogo')
const modelos = [
    ['BOSTON-13','Adizero Boston 13','Adidas','1099.90','899.90','boston13-1.webp'],
    ['ADIOS-PRO-4','Adizero Adios Pro 4','Adidas','1599.90',null,'adiospro1.avif'],
    ['ADIOS-PRO-5','Adizero Adios Pro 5','Adidas','2199.00',null,'adiospro5-1.avif'],
    ['EVO-SL','Adizero EVO SL','Adidas','1099.00',null,'evosl1.avif'],
    ['HYPERBOOST-EDGE','Hyperboost Edge','Adidas','799.90','699.90','hyperboostEdge1.avif'],
    ['ASICS-SUPERBLAST','ASICS Superblast 3','ASICS','1699.99',null,'superblast1.webp'],
    ['ASICS-NOVABLAST','ASICS Novablast 6','ASICS','999.99',null,'novablast1.webp'],
    ['ASICS-METASPEED','ASICS Metaspeed Tokyo (Sky/Edge)','ASICS','2299.99',null,'metaspeed1.webp'],
    ['ASICS-MEGABLAST','ASICS Megablast','ASICS','1999.99',null,'megablast.webp'],
    ['NB-REBEL-V5','New Balance Rebel v5','New Balance','999.99',null,'rebelv5-1.webp'],
    ['NB-1080-V15','New Balance 1080 v15','New Balance','1199.99',null,'1080v15-1.webp'],
    ['NB-SUPERCOMP','New Balance SuperComp Elite v6','New Balance','2299.99',null,'supercomp.webp'],
    ['NIKE-VAPORFLY','Nike Vaporfly 4','Nike','2299.99',null,'vaporfly1.avif'],
    ['NIKE-ALPHAFLY','Nike Alphafly 3','Nike','2299.99',null,'alphafly1.avif'],
    ['NIKE-VOMERO','Nike Vomero Plus','Nike','1299.99',null,'vomero1.avif'],
    ['OLYMPIKUS-CORRE-5','Olympikus Corre 5','Olympikus','599.00',null,'corre5-1.webp'],
    ['OLYMPIKUS-TURBO','Olympikus Turbo','Olympikus','699.00',null,'turbo1.webp'],
    ['OLYMPIKUS-SUPRA','Olympikus Supra','Olympikus','1299.00',null,'supra1.webp']
]
async function seedDemo() {
    await migrar()
    let criados = 0
    await db.transaction(async transaction => {
        const [categoria] = await Categoria.findOrCreate({ where: { nome: 'Corrida' }, transaction })
        for (const [codigo_produto,nome,marca,preco,preco_promocional,imagem] of modelos) {
            const fabricante = await Marca.findOne({ where: { nome: marca }, transaction })
            const [produto, novo] = await Produto.findOrCreate({ where: { codigo_produto }, defaults: { nome,marca,idMarca:fabricante?.codMarca,preco,preco_promocional,imagem_url:`../../imagens/${imagem}`,idCategoria:categoria.codCategoria,destaque:true }, transaction })
            if (!novo) continue // Nunca altera preços, disponibilidade ou saldo já cadastrados.
            criados++
            await Estoque.create({ idProduto: produto.codProduto, quantidade: 20 }, { transaction })
            await Variante.create({ idProduto: produto.codProduto, tamanho: 'Não informado', cor: 'Original', sku: `LEGADO-${produto.codProduto}`, quantidade: 20, legado: true }, { transaction })
            await HistoricoPreco.create({ idProduto: produto.codProduto, preco: preco_promocional ?? preco }, { transaction })
            const review = reviews.find(([regex]) => regex.test(nome))
            if (review) {
                await Midia.create({ idProduto: produto.codProduto, tipo:'REVIEW', url:`https://www.youtube.com/watch?v=${review[1]}`, titulo:`Review de ${nome}`, credito:'Review independente no YouTube' }, { transaction })
                for (let n=1;n<=4;n++) {
                    const arquivo = ['megablast','supercomp'].includes(review[2]) && n===1 ? review[2] : review[2]==='vaporfly' && n===2 ? 'vaporfl2' : review[2]+n
                    await Midia.create({idProduto:produto.codProduto,tipo:'IMAGEM',url:`../../imagens/${arquivo}.${review[3]}`,ordem:n,titulo:`${nome} - Foto ${n}`},{transaction})
                }
            }
        }
    })
    console.log(`${criados} produto(s) de demonstração criado(s). Registros existentes preservados.`)
    return criados
}
if (require.main===module) seedDemo().catch(err=>{console.error(err.message);process.exitCode=1}).finally(()=>db.close())
module.exports={seedDemo}

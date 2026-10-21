const conn = require('./db/conn') 

// Importa todas as 7 entidades com seus respectivos relacionamentos definidos em rel.js
const { 
    Usuario, 
    Pedido, 
    Produto, 
    ItemPedido, 
    Entrega, 
    Estoque,
    Categoria 
} = require('./models/rel') 

async function syncDataBase() {
    try {
        // Cria as tabelas que faltam sem apagar os dados existentes.
        await conn.sync()
        
        console.log('--------------------------------------------------')
        console.log('Banco de Dados sincronizado com sucesso (7 Tabelas)!')
        console.log('--------------------------------------------------')

    } catch (err) {
        process.exitCode = 1
        console.error('ERRO: Não foi possível sincronizar o banco de dados!', err)
    } finally {
        await conn.close()
        console.log('Conexão com o banco de dados fechada.')
    }
}

// Executa a função de sincronização do banco de dados
syncDataBase()

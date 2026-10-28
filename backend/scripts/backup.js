const fs = require('node:fs/promises')
const path = require('node:path')
require('dotenv').config({ path: path.join(__dirname, '../.env'), quiet: true })
const mysql = require('mysql2/promise')
async function backup() {
    const conn = await mysql.createConnection(process.env.MYSQL_URL || process.env.DATABASE_URL || {
        host: process.env.DB_HOST, port: process.env.DB_PORT, user: process.env.DB_USER, password: process.env.DB_PASS, database: process.env.DB_NAME
    })
    try {
        await conn.query('SET TRANSACTION ISOLATION LEVEL REPEATABLE READ')
        await conn.query('START TRANSACTION WITH CONSISTENT SNAPSHOT')
        const [tables] = await conn.query('SHOW FULL TABLES WHERE Table_type = \'BASE TABLE\'')
        const result = { criado_em: new Date().toISOString(), tabelas: {} }
        for (const tabela of tables) {
            const nome = Object.values(tabela)[0]
            const [schema] = await conn.query('SHOW CREATE TABLE ' + mysql.escapeId(nome))
            const [rows] = await conn.query('SELECT * FROM ' + mysql.escapeId(nome))
            result.tabelas[nome] = { schema: schema[0]['Create Table'], rows }
        }
        await conn.commit()
        const dir = path.join(__dirname, '../../.backups')
        await fs.mkdir(dir, { recursive: true })
        const file = path.join(dir, `backup-${Date.now()}.json`)
        await fs.writeFile(file, JSON.stringify(result), { mode: 0o600 })
        console.log(`Backup local criado em .backups/${path.basename(file)} (${tables.length} tabelas).`)
    } finally { await conn.end() }
}
if (require.main === module) backup().catch(() => { console.error('Não foi possível criar o backup. Confira a conexão.'); process.exitCode = 1 })
module.exports = { backup }

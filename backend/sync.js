const db = require('./db/conn')
require('./migrations').migrar().then(() => console.log('Estrutura atualizada com migrações aditivas.')).catch(err => { console.error(err.message); process.exitCode = 1 }).finally(() => db.close())

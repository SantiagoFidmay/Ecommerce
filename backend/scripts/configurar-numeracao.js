const db = require('../db/conn')
const { configurarNumeracao } = require('../services/numeracao.service')

configurarNumeracao()
    .then(total => console.log(`${total} produto(s) com numeração de 38 a 44. Saldo total preservado.`))
    .catch(err => { console.error(err.message); process.exitCode = 1 })
    .finally(() => db.close())

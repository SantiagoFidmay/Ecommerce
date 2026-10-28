const db = require('../db/conn')
const { expirarReservas } = require('../services/pedido.service')
expirarReservas().then(total => console.log(`${total} reserva(s) vencida(s) liberada(s).`)).catch(err => { console.error(err.name); process.exitCode = 1 }).finally(() => db.close())

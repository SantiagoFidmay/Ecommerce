const router = require('express').Router()
const ctrl = require('../controllers/itens-pedido.controller')
const { autenticar, apenasAdmin } = require('../middlewares/auth.middleware')

router.use(autenticar, apenasAdmin)
router.post('/', ctrl.criar)
router.get('/', ctrl.listar)
router.get('/buscar', ctrl.buscarPorNome)
router.get('/buscar/:nome', ctrl.buscarPorNome)
router.get('/:id', ctrl.getById)
router.put('/:id', ctrl.atualizar)
router.patch('/:id', ctrl.atualizarParcial)
router.delete('/:id', ctrl.deletar)

module.exports = router

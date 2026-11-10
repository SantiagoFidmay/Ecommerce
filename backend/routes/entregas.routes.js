const router = require('express').Router();
const ctrl = require('../controllers/entregas.controller');
const { autenticar, apenasAdmin } = require('../middlewares/auth.middleware');

router.get('/', autenticar, apenasAdmin, ctrl.listar);
router.get('/buscar', autenticar, apenasAdmin, ctrl.buscarPorNome);
router.get('/buscar/:nome', autenticar, apenasAdmin, ctrl.buscarPorNome);
router.get('/pedido/:pedido_id', autenticar, ctrl.getByPedido);
router.get('/:id', autenticar, apenasAdmin, ctrl.getById);
router.post('/', autenticar, apenasAdmin, ctrl.criar);
router.put('/:id', autenticar, apenasAdmin, ctrl.atualizar);
router.patch('/:id', autenticar, apenasAdmin, ctrl.atualizarParcial);
router.patch('/:id/status', autenticar, apenasAdmin, ctrl.atualizarStatus);
router.delete('/:id', autenticar, apenasAdmin, ctrl.deletar);

module.exports = router;

const router = require('express').Router();
const ctrl = require('../controllers/entregas.controller');
const { autenticar, apenasAdmin } = require('../middlewares/auth.middleware');

router.get('/', autenticar, apenasAdmin, ctrl.listar);
router.get('/pedido/:pedido_id', autenticar, ctrl.getByPedido);
router.patch('/:id/status', autenticar, apenasAdmin, ctrl.atualizarStatus);

module.exports = router;

const router = require('express').Router();
const ctrl = require('../controllers/estoque.controller');
const { autenticar, apenasAdmin } = require('../middlewares/auth.middleware');

router.get('/criticos', autenticar, apenasAdmin, ctrl.getCriticos);
router.get('/', autenticar, apenasAdmin, ctrl.listar);
router.get('/produto/:produto_id', autenticar, ctrl.getByProduto);
router.post('/', autenticar, apenasAdmin, ctrl.criar);
router.put('/:id', autenticar, apenasAdmin, ctrl.atualizar);
router.patch('/:id/movimentar', autenticar, apenasAdmin, ctrl.movimentar);

module.exports = router;

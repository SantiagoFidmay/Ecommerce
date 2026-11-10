const router = require('express').Router();
const ctrl = require('../controllers/estoque.controller');
const { autenticar, apenasAdmin } = require('../middlewares/auth.middleware');

router.get('/criticos', autenticar, apenasAdmin, ctrl.getCriticos);
router.get('/', autenticar, apenasAdmin, ctrl.listar);
router.get('/buscar', autenticar, apenasAdmin, ctrl.buscarPorNome);
router.get('/buscar/:nome', autenticar, apenasAdmin, ctrl.buscarPorNome);
router.get('/produto/:produto_id', autenticar, ctrl.getByProduto);
router.get('/:id', autenticar, apenasAdmin, ctrl.getById);
router.post('/', autenticar, apenasAdmin, ctrl.criar);
router.put('/:id', autenticar, apenasAdmin, ctrl.atualizar);
router.patch('/:id/movimentar', autenticar, apenasAdmin, ctrl.movimentar);
router.patch('/:id', autenticar, apenasAdmin, ctrl.atualizarParcial);
router.delete('/:id', autenticar, apenasAdmin, ctrl.deletar);

module.exports = router;

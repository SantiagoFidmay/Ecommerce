const router = require('express').Router();
const ctrl = require('../controllers/pedidos.controller');
const { autenticar, apenasAdmin } = require('../middlewares/auth.middleware');

router.post('/', autenticar, ctrl.criar);
router.post('/resumo', autenticar, ctrl.resumo);
router.get('/meus-pedidos', autenticar, ctrl.meusPedidos);
router.get('/buscar', autenticar, apenasAdmin, ctrl.buscarPorNome);
router.get('/buscar/:nome', autenticar, apenasAdmin, ctrl.buscarPorNome);
router.get('/', autenticar, apenasAdmin, ctrl.listarTodos);
router.get('/:id', autenticar, ctrl.getById);
router.patch('/:id/status', autenticar, apenasAdmin, ctrl.atualizarStatus);
router.put('/:id', autenticar, apenasAdmin, ctrl.atualizar);
router.patch('/:id', autenticar, apenasAdmin, ctrl.atualizarParcial);
router.delete('/:id', autenticar, apenasAdmin, ctrl.deletar);
router.post('/:id/cancelar', autenticar, ctrl.cancelar);

module.exports = router;

const router = require('express').Router();
const ctrl = require('../controllers/produtos.controller');
const { autenticar, apenasAdmin } = require('../middlewares/auth.middleware');

// Rotas públicas
router.get('/', ctrl.listar);
router.get('/buscar', ctrl.buscar);
router.get('/:id', ctrl.getById);

// Rotas privadas (admin)
router.post('/', autenticar, apenasAdmin, ctrl.criar);
router.put('/:id', autenticar, apenasAdmin, ctrl.atualizar);
router.patch('/:id', autenticar, apenasAdmin, ctrl.atualizarParcial);
router.delete('/:id', autenticar, apenasAdmin, ctrl.deletar);

module.exports = router;

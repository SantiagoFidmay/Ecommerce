const router = require('express').Router();
const ctrl = require('../controllers/relatorios.controller');
const { autenticar, apenasAdmin } = require('../middlewares/auth.middleware');

router.get('/dashboard', autenticar, apenasAdmin, ctrl.dashboard);
router.get('/vendas', autenticar, apenasAdmin, ctrl.vendasPorCategoria);
router.get('/faturamento', autenticar, apenasAdmin, ctrl.faturamentoMensal);
router.get('/estoque', autenticar, apenasAdmin, ctrl.situacaoEstoque);

module.exports = router;

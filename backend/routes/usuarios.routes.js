const router = require('express').Router();
const ctrl = require('../controllers/usuarios.controller');
const { autenticar, apenasAdmin } = require('../middlewares/auth.middleware');

router.get('/perfil', autenticar, ctrl.getPerfil);
router.patch('/perfil', autenticar, ctrl.atualizarParcial);
router.get('/', autenticar, apenasAdmin, ctrl.listarTodos);
router.get('/:id', autenticar, ctrl.getById);
router.put('/:id', autenticar, ctrl.atualizar);
router.patch('/:id', autenticar, ctrl.atualizarParcial);
router.delete('/:id', autenticar, apenasAdmin, ctrl.desativar);

module.exports = router;

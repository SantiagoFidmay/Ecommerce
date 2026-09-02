const router = require('express').Router();
const { login, cadastrar } = require('../controllers/auth.controller');

router.post('/login', login);
router.post('/usuarios', cadastrar);

module.exports = router;

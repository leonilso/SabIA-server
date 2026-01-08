import express from 'express';
const router = express.Router();

import UsuarioController from '../controllers/usuario.controller.js';
import AuthMiddleware from '../../middlewares/auth.middleware.js';

router.post('/', UsuarioController.criar);

router.use(AuthMiddleware.authenticate);

router.delete('/me', UsuarioController.deletar);
router.put('/me/senha', UsuarioController.alterarSenha);

export default router;

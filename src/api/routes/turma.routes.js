// src/api/routes/prova.routes.js
import express from 'express';
const router = express.Router();
import multer from 'multer';
import AuthMiddleware from '../../middlewares/auth.middleware.js';
import TurmaController from '../controllers/turma.controller.js'
/**
 * POST /api/turmas/
 * Rota para pegar as turmas por um usuário.
 * Espera validação e .
 *
 * authMiddleware (comentado) seria usado para pegar o ID_usuario do token JWT, por exemplo.
 */

router.use(AuthMiddleware.authenticate);
router.get(
  '/',
  TurmaController.pegarTurmas
);

router.get(
  '/:id',
  TurmaController.pegarTurma
);

router.post(
  '/',
  TurmaController.criarTurma
);

router.put(
  '/:id',
  TurmaController.editarTurma
);

router.delete(
  '/:id',
  TurmaController.deletarTurma
);



export default router;
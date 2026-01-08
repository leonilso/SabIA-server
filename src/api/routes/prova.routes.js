// src/api/routes/prova.routes.js
import express from 'express';
const router = express.Router();
import multer from 'multer';
import provaController from '../controllers/prova.controller.js';
import AuthMiddleware from '../../middlewares/auth.middleware.js';
router.use(AuthMiddleware.authenticate);
// Configura o multer para receber o PDF (opcional) em memória
const upload = multer({ storage: multer.memoryStorage() });

/**
 * POST /api/provas/gerar
 * Rota para gerar um novo conjunto de provas.
 * Espera 'multipart/form-Data' por causa do PDF.
 *
 * authMiddleware (comentado) seria usado para pegar o ID_usuario do token JWT, por exemplo.
 */
router.get(
  '/gerar/:id',
  // authMiddleware.verificarToken, // Para pegar o req.usuario.id
  provaController.gerarProvas
);

router.get(
  '/pegar/:id',
  // authMiddleware.verificarToken, // Para pegar o req.usuario.id
  provaController.pegarProvas
);

router.get('/me', provaController.me);

export default router;
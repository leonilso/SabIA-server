import express from 'express';
import multer from 'multer';
const router = express.Router();
import GabaritoController from '../controllers/gabarito.controller.js';

const upload = multer({ dest: '/tmp/uploads' }); // ajuste a pasta conforme seu ambiente

// rota: POST /gabarito/corrigir
router.post('/corrigir', upload.single('imagem'), GabaritoController.corrigir);

export default router;

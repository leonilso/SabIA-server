import express from 'express';
import multer from 'multer';
import GabaritoController from '../controllers/gabarito.controller.js';
import AuthMiddleware from "../../middlewares/auth.middleware.js";

const router = express.Router();
router.use(AuthMiddleware.authenticate);


const upload = multer({ dest: '/tmp/uploads' });

router.post('/corrigir', upload.single('imagem'), GabaritoController.corrigir);

export default router;

import express from 'express';
const router = express.Router();

import VerifyController from '../controllers/verify.controller.js';

router.post('/', VerifyController.verificarEmail);

export default router;

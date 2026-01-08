import express from 'express';
const router = express.Router();
import authController from '../controllers/auth.controller.js';
import AuthMiddleware from '../../middlewares/auth.middleware.js';

router.post('/login', authController.login);
router.post('/google', authController.loginWithGoogle)

router.use(AuthMiddleware.authenticate);
router.get('/me', authController.me)

export default router;

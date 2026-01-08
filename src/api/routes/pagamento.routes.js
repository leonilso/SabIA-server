import { Router } from "express";
import PagamentoController from "../controllers/pagamento.controller.js";
import AuthMiddleware from "../../middlewares/auth.middleware.js";

const router = Router();

router.use(AuthMiddleware.authenticate);
router.post("/checkout", PagamentoController.criarCheckout);

export default router;

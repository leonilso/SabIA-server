import express from "express";
import stripe from "../../config/stripe.js";
import PagamentoService  from "../../services/pagamento.service.js";

const router = express.Router();
const service = new PagamentoService();

router.post(
  "/",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];

    const event = stripe.webhooks.constructEvent(
      req.body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    if (event.type === "checkout.session.completed") {
      await service.confirmarPagamento(event.data.object);
    }

    res.json({ received: true });
  }
);

export default router;

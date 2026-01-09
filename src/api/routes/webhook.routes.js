import express from "express";
import cors from "cors";
import stripe from "../../config/stripe.js";
import PagamentoService  from "../../services/pagamento.service.js";

const router = express.Router();
const service = new PagamentoService();

// Middleware CORS separado
const corsOptions = { origin: "https://hooks.stripe.com" };

router.post(
  "/",
  cors(corsOptions),
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];

    let event;
    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    if (event.type === "checkout.session.completed") {
      await service.confirmarPagamento(event.data.object);
    }

    res.json({ received: true });
  }
);

export default router;

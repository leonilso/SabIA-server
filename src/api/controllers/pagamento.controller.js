import PagamentoService from "../../services/pagamento.service.js";
import MapPublicId from "../../middlewares/publicId.middleware.js";

export default class PagamentoController {

  static async criarCheckout (req, res){
    
    try {
      const { code, nome } = req.body;
      const userId = req.usuario.id;
      const userIdReal = await MapPublicId.usuario(userId)

      const ids = {
          semestral: "price_1SmPadGSoAdE1itzuhd34HeD",
          trimestral: "price_1SmPYhGSoAdE1itz4h0JY3Mr",
          mensal: "price_1SmPKwGSoAdE1itzSO2I1MHH"
      }

    
      const id = ids[code]

      const url = await PagamentoService.criarCheckout({
        userId: userIdReal,
        id,
        nome,
      });

      res.json({ url });
    } catch (err) {
      res.status(400).json({ error: err.message });
    }
  };
}

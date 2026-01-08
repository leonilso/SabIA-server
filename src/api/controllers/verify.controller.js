import VerifyService from '../../services/verify.service.js';

class VerifyController {
  static async verificarEmail(req, res, next) {
    try {
      const { token } = req.body;
      const emailVerificado = await VerifyService.verificarEmail(token);
      return res.status(200).json(emailVerificado);
    } catch (err) {
      next(err);
    }
  }
}

export default VerifyController;

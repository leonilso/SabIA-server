import MapPublicId from '../../middlewares/publicId.middleware.js';
import authService from '../../services/auth.service.js';

class AuthController {


static async login(req, res, next) {
  try {
    const { email, senha } = req.body;
    const result = await authService.login(email, senha);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
static async loginWithGoogle(req, res, next) {
  try {
    const { token } = req.body;
    const result = await authService.loginWithGoogle(token);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
static async me(req, res, next) {
  try {
    const userId = req.usuario.id;
    const realUserId = await MapPublicId.usuario(userId);
    const result = await authService.me(realUserId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}
}

export default AuthController;

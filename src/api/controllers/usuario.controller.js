import MapPublicId from '../../middlewares/publicId.middleware.js';
import UsuarioService from '../../services/usuario.service.js';

class UsuarioController {
  static async criar(req, res, next) {
    try {
      const usuario = await UsuarioService.criarConta(req.body);
      return res.status(201).json(usuario);
    } catch (err) {
      next(err);
    }
  }
static async deletar(req, res, next) {
  try {
    const userId = req.usuario.id;
    const realUserId = await MapPublicId.usuario(userId);

    await UsuarioService.deletar(realUserId);

    return res.status(200).json({ message: "Conta excluída com sucesso" });
  } catch (err) {
    next(err);
  }
}

static async alterarSenha(req, res, next) {
  try {
    const userId = req.usuario.id;
    const realUserId = await MapPublicId.usuario(userId);
    const { senha } = req.body;

    await UsuarioService.alterarSenha(realUserId, senha);

    return res.status(200).json({ message: "Senha alterada com sucesso" });
  } catch (err) {
    next(err);
  }
}

}

export default UsuarioController;

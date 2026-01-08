import usuarioRepo from '../repositories/usuario.repository.js';

class VerifyService {
static async verificarEmail(token) {
  const user = await usuarioRepo.findByEmailToken(token);

  if (!user) {
    throw new Error('Token inválido');
  }

  if (user.email_verificacao_expira < new Date()) {
    throw new Error('Token expirado');
  }

  await usuarioRepo.update(user.ID, {
    email_verificado: true,
    email_verificacao_token: null,
    email_verificacao_expira: null
  });

  return { message: 'E-mail verificado com sucesso' };
}
}

export default VerifyService;

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import usuarioRepo from '../repositories/usuario.repository.js';
import authConfig from '../config/auth.js';
import { OAuth2Client } from 'google-auth-library';
import { nanoid } from 'nanoid';
import PagamentoRepository from '../repositories/pagamento.repository.js';
import MapPublicId from '../middlewares/publicId.middleware.js';

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


class AuthService {


static async login(email, senha) {
  const emailCaixaAlta = email.toLowerCase()
  const usuario = await usuarioRepo.findByEmail(emailCaixaAlta);
  
  if (!usuario) {
    throw new Error('Usuário não encontrado');
  }

  if (!usuario.email_verificado){
    throw new Error('Email não verificado cheque sua caixa de emails');
  }

  const senhaValida = await bcrypt.compare(senha, usuario.senha);
  if (!senhaValida) {
    throw new Error('Senha inválida');
  }
  const assinatura = await PagamentoRepository.verificarAssinaturaCompleta(usuario.ID)

  const status = assinatura.status == "ativo" ? true : false;
  const token = jwt.sign(
    { id: usuario.public_id, nome: usuario.nome, statusAssinatura: status },
    authConfig.jwtSecret,
    { expiresIn: authConfig.jwtExpiresIn }
  );

  return {
    usuario: {
      id: usuario.public_id,
      nome: usuario.nome
    },
    token
  };
}

static async me(userId) {

  const usuario = await usuarioRepo.findById(userId);
  
  if (!usuario) {
    throw new Error('Usuário não encontrado');
  }

  const assinatura = await PagamentoRepository.verificarAssinaturaCompleta(usuario.ID)

  const status = assinatura.status == "ativo" ? true : false;
  const token = jwt.sign(
    { id: usuario.public_id, nome: usuario.nome, statusAssinatura: status },
    authConfig.jwtSecret,
    { expiresIn: authConfig.jwtExpiresIn }
  );

  return {
    usuario: {
      id: usuario.public_id,
      nome: usuario.nome
    },
    token
  };
}

static async loginWithGoogle(tokenGoogle) {
  const ticket = await client.verifyIdToken({
            idToken: tokenGoogle,
            audience: process.env.GOOGLE_CLIENT_ID,
        });

  const payload = ticket.getPayload();
        const { email, name, picture, sub: googleId } = payload;

  const emailCaixaAlta = email.toLowerCase()

  let usuario = await usuarioRepo.findByEmail(emailCaixaAlta);

  const senhaAleatoria = await bcrypt.hash(String(Math.random()), 10)

  let idReal;
  if (!usuario){
    const publicId = nanoid(10);
    usuario = await usuarioRepo.create({
          nome: name,
          email: emailCaixaAlta,
          senha: senhaAleatoria,
          email_verificado : true,
          publicId
        });
    idReal = await MapPublicId.usuario(publicId)
  } else {
    idReal = usuario.ID
  }

  
  const assinatura = await PagamentoRepository.verificarAssinaturaCompleta(idReal)

  const status = assinatura.status == "ativo" ? true : false;
  const token = jwt.sign(
    { id: usuario.public_id, nome: usuario.nome, statusAssinatura: status },
    authConfig.jwtSecret,
    { expiresIn: authConfig.jwtExpiresIn }
  );

  return {
    usuario: {
      id: usuario.public_id,
      nome: usuario.nome
    },
    token
  };
}

}

export default AuthService;

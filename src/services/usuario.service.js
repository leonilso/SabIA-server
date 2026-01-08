import bcrypt from 'bcrypt';
import usuarioRepo from '../repositories/usuario.repository.js';
import jwt from 'jsonwebtoken';
import authConfig from '../config/auth.js';
import mailer from './mailer.service.js';
import crypto from 'crypto';
import { nanoid } from 'nanoid';
import MaterialService from './material.service.js';
import CrudPDF from './crudpdf.service.js';

class UsuarioService {
  static gerarTokenEmail() {
    return crypto.randomBytes(32).toString('hex');
  }

  static validarEmail(email) {
    if (!email) {
      throw new Error("E-mail é obrigatório");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      throw new Error("E-mail inválido");
    }
  }

  static validarSenha(senha) {
    if (!senha) {
      throw new Error("Senha é obrigatória");
    }

    // mínimo 8 caracteres, pelo menos 1 letra e 1 número
    const senhaRegex = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/;

    if (!senhaRegex.test(senha)) {
      throw new Error(
        "A senha deve ter no mínimo 8 caracteres, contendo letras e números"
      );
    }
  }


  static async criarConta({ nome, email, senha }) {
    const emailCaixaAlta = email.toLowerCase()
    this.validarEmail(emailCaixaAlta);
    this.validarSenha(senha);




    const usuarioExistente = await usuarioRepo.findByEmail(emailCaixaAlta);
    
    if (usuarioExistente) {
      if(usuarioExistente.email_verificado){
        throw new Error('email já cadastrado');
      } else {
        await usuarioRepo.deleteByEmail(emailCaixaAlta)
      }
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    const tokenVerificacao = crypto.randomBytes(32).toString('hex');
    const expiraEm = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const publicId = nanoid(10);
    const user = await usuarioRepo.create({
      nome,
      email: emailCaixaAlta,
      senha: senhaHash,
      email_verificado: false,
      email_verificacao_token: tokenVerificacao,
      email_verificacao_expira: expiraEm,
      publicId
    });

    // Envia e-mail
    const link = `http://sabia.leonilso.com.br:8080/email-confirmado?token=${tokenVerificacao}`;

mailer.send({
  to: user.email,
  subject: 'Confirme seu e-mail',
  text: `Olá, ${user.nome}. Confirme seu e-mail acessando: ${link}`,
  html: `
  <div style="
    background-color: #f5f5f5;
    padding: 40px 0;
    font-family: Arial, Helvetica, sans-serif;
  ">
    <table align="center" width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <table width="100%" max-width="420" style="
            max-width: 420px;
            background-color: #FF9429;
            border-radius: 16px;
            padding: 32px;
            color: #ffffff;
          ">
            <tr>
              <td style="text-align: center;">
                <h1 style="
                  margin: 0 0 12px;
                  font-size: 24px;
                  font-weight: bold;
                ">
                  Confirme seu e-mail
                </h1>

                <p style="
                  margin: 0 0 20px;
                  font-size: 14px;
                  opacity: 0.9;
                ">
                  Olá, <strong>${user.nome}</strong> 👋  
                  <br />
                  Para finalizar seu cadastro, confirme seu e-mail.
                </p>

                <a href="${link}" style="
                  display: inline-block;
                  background-color: #7038FF;
                  color: #ffffff;
                  padding: 14px 28px;
                  border-radius: 12px;
                  text-decoration: none;
                  font-size: 16px;
                  font-weight: bold;
                ">
                  Confirmar e-mail
                </a>

                <p style="
                  margin-top: 24px;
                  font-size: 12px;
                  opacity: 0.8;
                ">
                  Se você não criou uma conta, pode ignorar este e-mail.
                </p>

                <p style="
                  margin-top: 16px;
                  font-size: 11px;
                  opacity: 0.6;
                ">
                  © ${new Date().getFullYear()} • SABIA - gere suas provas com IA.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </div>
  `
});

    return {
      message: 'Conta criada. Verifique seu e-mail para ativar.'
    };
  }

  static async alterarSenha(userId, novaSenha) {
    this.validarSenha(novaSenha);

    const usuario = await usuarioRepo.buscarPorId(userId);
    if (!usuario) {
      throw new Error("Usuário não encontrado");
    }

    const senhaHash = await bcrypt.hash(novaSenha, 10);

    await UsuarioRepository.alterarSenha(userId, senhaHash);
  }

  static async deletar(userId) {
    const usuario = await usuarioRepo.findById(userId);
    await MaterialService.deleteByUserId(userId);
    await CrudPDF.apagarPdfsUsuario(userId)

    if (!usuario) {
      throw new Error("Usuário não encontrado");
    }

    await usuarioRepo.deletar(userId);
  }


}
export default UsuarioService;

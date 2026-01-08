import stripe from "../config/stripe.js";
import PagamentoRepository from "../repositories/pagamento.repository.js";

export default class PagamentoService {


  static async criarCheckout({ userId, id, nome }) {
    const usuario = await PagamentoRepository.buscarUsuarioPorId(userId);
    if (!usuario) throw new Error("Usuário não encontrado");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      // payment_method_types: ["pix"],
      customer_email: usuario.email,
      line_items: [
        {
          price: id,
          quantity: 1,
        },
      ],
      success_url: `${process.env.FRONT_URL}/pagamento-sucesso?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONT_URL}/pagamento-cancelado`,
      metadata: {
        userId,
        nome,
      },
    });


    await PagamentoRepository.atualizarStatusUsuario(userId, "pendente");
    return session.url;
  }

  async confirmarPagamento(session) {
    const usuarioId = session.metadata.userId;
    const planoNome = session.metadata.nome;
    const dataBanco = await PagamentoRepository.verificarAssinatura(usuarioId)
    const dataHoje = new Date();

    const mesesParaSomar = {
      'mensal': 1,
      'trimestral': 3,
      'semestral': 6,
      'anual': 12
    };

    const meses = mesesParaSomar[planoNome.toLowerCase()] || 1;

    let dataPartida = new Date();

    if (dataBanco && new Date(dataBanco) > dataHoje) {
      dataPartida = new Date(dataBanco);
    }

    // 3. Calcular a nova data de expiração
    const dataFim = new Date(dataPartida);
    dataFim.setMonth(dataFim.getMonth() + meses);

    await PagamentoRepository.criarAssinatura({
      usuarioId,
      planoNome,
      dataFim,
      externalId: session.subscription,
      status: "ativo",
    });

    await PagamentoRepository.atualizarStatusUsuario(usuarioId, "ativo");
  }
  static async me(userId) {
    const provasRestantes = await PagamentoRepository.provasRestantes(userId)

    return provasRestantes;
}
}

import { db } from "../config/database.js"

 class PagamentoRepository {
  static async criarAssinatura({
    usuarioId,
    planoNome,
    dataFim,
    externalId,
    status,
  }) {
    await db.execute(
      `
      UPDATE Assinaturas SET 
      plano_nome = ?, data_fim = ?, provas_restantes = ?, external_id = ?, status = ?, data_inicio = NOW() WHERE usuario_id = ?
      `,
      [planoNome, dataFim, null, externalId, status, usuarioId]
    );
    await db.execute(
      `
      INSERT pagamentos (
      plano_nome, ID_usuario) VALUES (?, ?)
      `,
      [planoNome, usuarioId]
    );
  }

  static async atualizarStatusUsuario(usuarioId, status) {
    await db.execute(
      `UPDATE Usuario SET status_assinatura = ? WHERE ID = ?`,
      [status, usuarioId]
    );
  }

  static async buscarUsuarioPorId(id) {
    const [rows] = await db.execute(
      `SELECT * FROM Usuario WHERE ID = ?`,
      [id]
    );
    return rows[0];
  }
  static async verificarAssinatura(id) {
    const [rows] = await db.execute(
      `SELECT data_fim FROM assinaturas WHERE usuario_id = ?`,
      [id]
    );
    return rows[0].data_fim;
  }
  static async verificarAssinaturaCompleta(id) {
    const [rows] = await db.execute(
      `SELECT * FROM assinaturas WHERE usuario_id = ?`,
      [id]
    );
    return rows[0];
  }
  static async reduzirProva(id) {
    const [rows] = await db.execute(
      `UPDATE Assinaturas
        SET provas_restantes =
            CASE
                WHEN provas_restantes IS NULL THEN NULL
                WHEN provas_restantes > 0 THEN provas_restantes - 1
                ELSE 0
            END
        WHERE usuario_id = ?;`,
      [id]
    );
    return rows[0];
  }
  static async provasRestantes(id) {
    const [rows] = await db.execute(
      `SELECT provas_restantes FROM ASSINATURAS
        WHERE usuario_id = ?;`,
      [id]
    );
    return rows[0];
  }
}

export default PagamentoRepository;

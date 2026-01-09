import { db } from "../config/database.js";

export default class MaterialRepository {
  static async create(data) {
    const {
      publicId,
      projetoId,
      fileName,
      pathArquivo,
      nomeArquivo,
      mimeType,
      tamanhoBytes
    } = data;

    const [result] = await db.execute(
      `
      INSERT INTO MATERIAIS
      (public_id, projeto_id, nome, path_arquivo, nome_arquivo, mime_type, tamanho_bytes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [
        publicId,
        projetoId,
        fileName, 
        pathArquivo,
        nomeArquivo,
        mimeType,
        tamanhoBytes
      ]
    );

    return result.insertId;
  }
  static async findByProjetoId(projetoId) {
    const [rows] = await db.execute(
      `
      SELECT
        id,
        public_id,
        projeto_id,
        nome,
        path_arquivo,
        nome_arquivo,
        mime_type,
        tamanho_bytes
      FROM MATERIAIS
      WHERE projeto_id = ?
      LIMIT 1
      `,
      [projetoId]
    );

    return rows.length ? rows[0] : null;
  }
  static async findByUserId(usuarioId) {
    const [rows] = await db.execute(
      `SELECT m.*
       FROM MATERIAIS m
       JOIN PROJETOS p ON p.ID = m.projeto_id
       WHERE p.ID_usuario = ?`,
      [usuarioId]
    );
    return rows;
  }
    static async deleteByProjetoId(projetoId) {
    await db.execute(
      `DELETE FROM MATERIAIS WHERE projeto_id = ?`,
      [projetoId]
    );
  }
  static async deleteByUserId(userId) {
    await db.execute(
      `DELETE m
     FROM MATERIAIS m
     JOIN PROJETOS p ON p.ID = m.projeto_id
     WHERE p.ID_usuario = ?`,
      [userId]
    );
  }
}

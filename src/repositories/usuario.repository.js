import { db } from '../config/database.js'; 

class UsuarioRepository {
static async findByCPF(cpf) {
  const [rows] = await db.query(
    'SELECT * FROM Usuario WHERE cpf = ?',
    [cpf]
  );
  return rows[0];
}

static async findById(id) {
  console.log(id)
  const [rows] = await db.query(
    'SELECT * FROM Usuario WHERE ID = ?',
    [id]
  );
  return rows[0];
}

static async deletar(userId) {
    const [result] = await db.execute(
      "DELETE FROM Usuario WHERE ID = ?",
      [userId]
    );

    return result.affectedRows > 0;
  }

  static async alterarSenha(userId, senhaHash) {
    const [result] = await db.execute(
      "UPDATE Usuario SET senha = ? WHERE ID = ?",
      [senhaHash, userId]
    );

    return result.affectedRows > 0;
  }

static async findByEmail(email) {
  const [rows] = await db.query(
    'SELECT * FROM Usuario WHERE email = ?',
    [email]
  );
  return rows[0];
}
static async deleteByEmail(email) {
  const [rows] = await db.query(
    'DELETE FROM Usuario WHERE email = ?',
    [email]
  );
  return "ususário deletado";
}

static async findByEmailToken(token) {
  const [rows] = await db.query(
    'SELECT * FROM Usuario WHERE email_verificacao_token = ?',
    [token]
  );
  return rows[0];
}

static async update(user, info_emails) {
  const [rows] = await db.query(
    'UPDATE USUARIO SET email_verificado = ?, email_verificacao_token = ?, email_verificacao_expira = ? WHERE ID = ?',
    [info_emails.email_verificado, info_emails.email_verificacao_token, info_emails.email_verificacao_expira, user]
  );
  return rows[0];
}


static async create({ nome, email, senha, email_verificado = null, email_verificacao_token = null, email_verificacao_expira = null, publicId}) {
  const [row] = await db.query(
    `INSERT INTO Usuario (nome, email, senha, email_verificado, email_verificacao_token, email_verificacao_expira, public_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [nome, email, senha, email_verificado, email_verificacao_token, email_verificacao_expira, publicId]
  );

  const userId = row.insertId

    await db.query(
    `INSERT INTO ASSINATURAS (usuario_id, plano_nome, provas_restantes, data_fim, status)
     VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), ?)`,
    [userId, "free", 3, "inativo" ]
  );

  return {
    public_id: publicId,
    nome,
    email
  };
}
}

export default UsuarioRepository;

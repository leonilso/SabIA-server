import { db } from '../config/database.js'; 
class ProjetoRepository {
  // Método auxiliar para padronizar a formatação de cada linha vinda do banco

  static montarProvas(rows) {
    const provasMap = new Map();

    for (const row of rows) {
      const provaKey = `${row.projeto_id}-${row.gabarito_id}`;

      if (!provasMap.has(provaKey)) {
        provasMap.set(provaKey, {
          projeto: {
            id: row.projeto_id,
            disciplina: row.disciplina,
            public_id: row.public_id,
            status: row.status
          },
          aluno: row.ID_aluno
            ? {
              id: row.ID_aluno,
              nome: row.aluno_nome,
              email: row.aluno_email
            }
            : {
              tipo: "padrao"
            },
          questoes: []
        });
      }

      const prova = provasMap.get(provaKey);

      let questao = prova.questoes.find(
        q => q.numero === row.numero_questao
      );

      if (!questao) {
        questao = {
          id: row.questao_id,
          numero: row.numero_questao,
          tipo: row.questao_tipo,
          enunciado: row.questao_enunciado
        };

        if (row.questao_tipo === "objetiva") {
          questao.objetiva = {
            alternativas: [],
            correta: null
          };
        }

        if (row.questao_tipo === "associativa") {
          questao.associativa = {
          };
        }

        if (row.questao_tipo === "descritiva") {
          questao.descritiva = {
            resposta_correta: null
          };
        }

        prova.questoes.push(questao);
      }

      // ===== Objetiva =====
      if (row.questao_tipo === "objetiva" && row.alternativa) {
        questao.objetiva.alternativas.push({
          alternativa: row.alternativa,
          conteudo: row.conteudo_resposta,
          correta: !!row.correta
        });

        if (row.correta) {
          questao.objetiva.correta = row.alternativa;
        }
      }

      // ===== Associativa =====
      if (row.questao_tipo === "associativa") {
        if (!questao.associativa.resposta) {
          questao.associativa.resposta = JSON.parse(
            row.conteudo_resposta
          );
        }
      }

      // ===== Descritiva =====
      if (row.questao_tipo === "descritiva" && row.ID_resposta_correta) {
        questao.descritiva.resposta_correta = row.conteudo_resposta;
      }
    }

    return Array.from(provasMap.values());
  }


  static _formatRow(row) {
    if (!row) return null;
    return {
      ...row,
      temas: row.temas ? row.temas.split(',') : []
    };
  }

  static distribuirQuestoes(total) {
    const tipos = ["descritiva", "objetiva", "associativa"];
    const base = Math.floor(total / tipos.length);
    let resto = total % tipos.length;

    const resultado = {
      descritiva: base,
      objetiva: base,
      associativa: base
    };

    for (const tipo of tipos) {
      if (resto === 0) break;
      resultado[tipo]++;
      resto--;
    }

    return resultado;
  }

  static async findByTurma(turmaId, userId) {
    const [rows] = await db.execute(
      `SELECT 
          u.public_id as ID_usuario, 
          p.disciplina, 
          p.QTD_questoes, 
          p.QTD_provas, 
          p.questoes_descritivas, 
          p.questoes_objetivas, 
          p.questoes_associativas, 
          p.public_id as ID, 
          t.nome_turma, 
          t.public_id as ID_turma,
            GROUP_CONCAT(te.nome_tematica) AS temas
        FROM Projetos p
        JOIN turma t ON p.ID_turma = t.ID
        LEFT JOIN usuario u ON p.ID_usuario = u.ID
        LEFT JOIN Tema_projeto tp ON p.ID = tp.ID_projeto
        LEFT JOIN Tema te ON tp.ID_tema = te.ID
        WHERE p.ID_turma = ?
          AND t.ID_usuario = ?
        GROUP BY p.ID`,
      [turmaId, userId]
    );
    return rows.map(this._formatRow);
  }

  static async findTestById(projetoId, userId) {
    const [rows] = await db.execute(
      `
SELECT
  p.ID                     AS projeto_id,
  p.disciplina,
  p.public_id,
  p.status,

  g.ID                     AS gabarito_id,
  g.ID_aluno               AS gabarito_aluno_id,

  a.ID                     AS ID_aluno,
  a.nome                   AS aluno_nome,
  a.email                  AS aluno_email,

  pg.ID                    AS posicao_id,
  pg.numero_questao,
  pg.pagina,

  q.ID                     AS questao_id,
  q.tipo                   AS questao_tipo,
  q.enunciado              AS questao_enunciado,
  q.ID_resposta_correta,

  r.ID                     AS resposta_id,
  r.conteudo_resposta,

  pa.ID                    AS alternativa_id,
  pa.alternativa,
  pa.repeticao,
  pa.correta

FROM Projetos p

INNER JOIN Turma t ON t.ID = p.ID_turma

INNER JOIN GABARITO g ON g.ID_projeto = p.ID

LEFT JOIN Aluno a ON a.ID = g.ID_aluno

LEFT JOIN POSICAO_GABARITO pg 
  ON pg.ID_gabarito = g.ID

INNER JOIN Questoes q ON q.ID = pg.ID_questao

LEFT JOIN POSICAO_ALTERNATIVA pa 
  ON pa.ID_posicao_gabarito = pg.ID

LEFT JOIN Respostas r 
  ON (
    (q.tipo <> 'descritiva' AND r.ID = pa.ID_alternativa)
    OR
    (q.tipo = 'descritiva' AND r.ID = q.ID_resposta_correta)
  )

WHERE
  p.ID = ?
  AND p.ID_usuario = ?

ORDER BY
  g.ID,
  pg.numero_questao,
  pa.repeticao,
  pa.alternativa;
    `,
      [projetoId, userId]
    );


    return this.montarProvas(rows);
  }

static async saveTestById(projetoId, userId, provas) {
  console.log(provas)
  const conn = await db.getConnection();

  try {
    await conn.beginTransaction();

    // 1. Limpa tudo do projeto
    await conn.execute(
      `
      DELETE FROM Respostas
      WHERE ID_questao IN (
        SELECT ID FROM Questoes WHERE ID_projeto = ?
      )
      `,
      [projetoId]
    );

    await conn.execute(
      `DELETE FROM Questoes WHERE ID_projeto = ?`,
      [projetoId]
    );

    await conn.execute(
      `DELETE FROM GABARITO WHERE ID_projeto = ?`,
      [projetoId]
    );

    // 2. Recria tudo
    for (const prova of provas) {
      const idAluno = prova.aluno?.id ? prova.aluno?.id : null

      for (const questao of prova.questoes) {
        // INSERE QUESTÃO
        const [qResult] = await conn.execute(
          `
          INSERT INTO Questoes (ID_aluno, tipo, enunciado, ID_projeto)
          VALUES (?, ?, ?, ?)
          `,
          [idAluno, questao.tipo, questao.enunciado, projetoId]
        );

        const questaoId = qResult.insertId;
        let respostaCorretaId = null;

        // DESCRITIVA
        if (questao.tipo === "descritiva") {
          const [r] = await conn.execute(
            `
            INSERT INTO Respostas (ID_questao, conteudo_resposta)
            VALUES (?, ?)
            `,
            [questaoId, questao.descritiva.resposta_correta]
          );
          respostaCorretaId = r.insertId;
        }

        // OBJETIVA
        if (questao.tipo === "objetiva") {
          for (const alt of questao.objetiva.alternativas) {
            const [r] = await conn.execute(
              `
              INSERT INTO Respostas (ID_questao, conteudo_resposta)
              VALUES (?, ?)
              `,
              [questaoId, alt.conteudo]
            );

            if (alt.alternativa === questao.objetiva.correta) {
              respostaCorretaId = r.insertId;
            }
          }
        }

        // ASSOCIATIVA
        if (questao.tipo === "associativa") {
          const [r] = await conn.execute(
            `
            INSERT INTO Respostas (ID_questao, conteudo_resposta)
            VALUES (?, ?)
            `,
            [questaoId, JSON.stringify(questao.associativa.resposta)]
          );
          respostaCorretaId = r.insertId;
        }

        // ATUALIZA resposta correta
        await conn.execute(
          `
          UPDATE Questoes
          SET ID_resposta_correta = ?
          WHERE ID = ?
          `,
          [respostaCorretaId, questaoId]
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}



  static async findByUser(userId) {
    const [rows] = await db.execute(
      `SELECT 
          u.public_id as ID_usuario, 
          p.disciplina, 
          p.QTD_questoes, 
          p.QTD_provas, 
          p.questoes_descritivas, 
          p.questoes_objetivas, 
          p.questoes_associativas, 
          p.public_id as ID, 
          t.nome_turma, 
          t.public_id as ID_turma,
          GROUP_CONCAT(te.nome_tematica) AS temas
      FROM Projetos p
      JOIN turma t ON p.ID_turma = t.ID
      LEFT JOIN usuario u ON p.ID_usuario = u.ID
      LEFT JOIN Tema_projeto tp ON p.ID = tp.ID_projeto
      LEFT JOIN Tema te ON tp.ID_tema = te.ID
      WHERE p.ID_usuario = ?
      GROUP BY p.ID`,
      [userId]
    );
    return rows.map(this._formatRow);
  }

  static async findById(projetoId) {
    const [rows] = await db.execute(
      `SELECT 
          u.public_id as ID_usuario, 
          p.disciplina, 
          p.QTD_questoes, 
          p.QTD_provas, 
          p.questoes_descritivas, 
          p.questoes_objetivas, 
          p.questoes_associativas, 
          p.public_id as ID, 
          t.nome_turma, 
          t.public_id as ID_turma,
          GROUP_CONCAT(te.nome_tematica) AS temas
      FROM Projetos p
      JOIN turma t ON p.ID_turma = t.ID
      LEFT JOIN usuario u ON p.ID_usuario = u.ID
      LEFT JOIN Tema_projeto tp ON p.ID = tp.ID_projeto
      LEFT JOIN Tema te ON tp.ID_tema = te.ID
      WHERE p.ID = ?
      GROUP BY p.ID`,
      [projetoId]
    );

    if (rows.length === 0) return null;
    return this._formatRow(rows[0]);
  }

  static async findByIdReal(projetoId) {
    const [rows] = await db.execute(
      `SELECT 
          p.ID_usuario, 
          p.disciplina, 
          p.QTD_questoes, 
          p.QTD_provas, 
          p.questoes_descritivas, 
          p.questoes_objetivas, 
          p.questoes_associativas, 
          p.ID, 
          t.nome_turma, 
          t.ID as ID_turma,
          GROUP_CONCAT(te.nome_tematica) AS temas
      FROM Projetos p
      JOIN turma t ON p.ID_turma = t.ID
      LEFT JOIN Tema_projeto tp ON p.ID = tp.ID_projeto
      LEFT JOIN Tema te ON tp.ID_tema = te.ID
      WHERE p.ID = ?
      GROUP BY p.ID`,
      [projetoId]
    );

    if (rows.length === 0) return null;
    return this._formatRow(rows[0]);
  }

  static async findByIdPublic(projetoId) {
    const [rows] = await db.execute(
      `SELECT 
          u.public_id as ID_usuario,  
          p.disciplina, 
          p.QTD_questoes, 
          p.QTD_provas, 
          p.questoes_descritivas, 
          p.questoes_objetivas, 
          p.questoes_associativas, 
          p.public_id as ID, 
          t.nome_turma, 
          t.public_id as ID_turma,
          GROUP_CONCAT(te.nome_tematica) AS temas
      FROM Projetos p
      JOIN turma t ON p.ID_turma = t.ID
      LEFT JOIN usuario u ON p.ID_usuario = u.ID
      LEFT JOIN Tema_projeto tp ON p.ID = tp.ID_projeto
      LEFT JOIN Tema te ON tp.ID_tema = te.ID
      WHERE p.public_id = ?
      GROUP BY p.ID`,
      [projetoId]
    );

    if (rows.length === 0) return null;
    return this._formatRow(rows[0]);
  }

  static async create(dados, public_id) {
    const { userId, disciplina, turma, questoes, qtdQuestoes, qtdProvas, temas } = dados;
    console.log(dados)
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [resProjeto] = await connection.execute(
        `INSERT INTO Projetos (ID_usuario, Disciplina, ID_turma, QTD_questoes, QTD_provas, public_id, questoes_descritivas, questoes_objetivas, questoes_associativas) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [userId, disciplina, turma, qtdQuestoes, qtdProvas, public_id, questoes.descritiva, questoes.objetiva, questoes.associativa]
      );

      const projetoId = resProjeto.insertId;

      for (const nomeTema of temas) {
        await connection.execute(
          `INSERT IGNORE INTO Tema (nome_tematica) VALUES (?)`,
          [nomeTema]
        );

        const [resTema] = await connection.execute(
          `SELECT ID FROM Tema WHERE nome_tematica = ?`,
          [nomeTema]
        );

        const temaId = resTema[0].ID;

        await connection.execute(
          `INSERT INTO Tema_projeto (ID_projeto, ID_tema) VALUES (?, ?)`,
          [projetoId, temaId]
        );
      }

      await connection.commit();

      // Retorna o objeto completo buscando-o novamente pelo ID recém criado
      return await this.findById(projetoId);

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async editById(projetoId, dados) {
    const { disciplina, turma, qtdQuestoes, questoes, qtdProvas, temas } = dados;
    console.log(questoes)
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      await connection.execute(
        `UPDATE Projetos SET Disciplina = ?, ID_turma = ?, QTD_questoes = ?, QTD_provas = ?, questoes_descritivas = ?, questoes_objetivas = ?, questoes_associativas = ?
        WHERE ID = ?`,
        [disciplina, turma, qtdQuestoes, qtdProvas, questoes.descritiva, questoes.objetiva, questoes.associativa, projetoId]
      );

      await connection.execute(
        `DELETE FROM Tema_projeto WHERE ID_projeto = ?`,
        [projetoId]
      );

      await connection.execute(
        `DELETE FROM ALUNO_PROJETO WHERE ID_projeto = ?`,
        [projetoId]
      );
      await connection.execute(
        `DELETE FROM questoes WHERE ID_projeto = ?`,
        [projetoId]
      );

      for (const nomeTema of temas) {
        await connection.execute(
          `INSERT IGNORE INTO Tema (nome_tematica) VALUES (?)`,
          [nomeTema]
        );

        const [resTema] = await connection.execute(
          `SELECT ID FROM Tema WHERE nome_tematica = ?`,
          [nomeTema]
        );

        const temaId = resTema[0].ID;

        await connection.execute(
          `INSERT INTO Tema_projeto (ID_projeto, ID_tema) VALUES (?, ?)`,
          [projetoId, temaId]
        );
      }

      await connection.commit();

      // Retorna o objeto atualizado com a mesma estrutura do findById
      return await this.findById(projetoId);

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async enviarAluno(dados) {
    const { id, questoes, tema, adaptacoes, projetoId } = dados;
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      // 1️⃣ Buscar projeto
      const [projeto] = await connection.execute(
        `SELECT ID, QTD_questoes 
       FROM Projetos 
       WHERE ID = ? `,
        [projetoId]
      );
      if (projeto.length === 0) {
        throw new Error("Projeto não encontrado ");
      }

      const { ID, QTD_questoes } = projeto[0];

      // 2️⃣ Distribuir questões (se não vierem do aluno)
      const distribuicao = questoes.descritiva + questoes.objetiva + questoes.associativa > 0
        ? {
          descritiva: questoes.descritiva,
          objetiva: questoes.objetiva,
          associativa: questoes.associativa
        }
        : distribuirQuestoes(QTD_questoes);

      // 3️⃣ Inserir aluno
      await connection.execute(
        `INSERT INTO aluno_projeto (
        ID_aluno,
        ID_projeto,
        tematica,
        questoes_descritivas,
        questoes_objetivas,
        questoes_associativas,
        dica,
        auxilio_visao
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          id,
          ID,
          tema,
          distribuicao.descritiva,
          distribuicao.objetiva,
          distribuicao.associativa,
          adaptacoes?.dicas ?? false,
          adaptacoes?.visao ?? false
        ]
      );

      await connection.commit();
      return { sucesso: true };

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }

  static async pegarIdsPelaTurma(turmaId){
    try {
      const [result] = await db.execute(
        `SELECT public_id FROM Projetos WHERE ID_turma = ?`,
        [turmaId]
      );
      return result

    } catch (error) {
      throw error;
    }
  }

  static async pegarIdsPeloUser(userId){
    try {
      const [result] = await db.execute(
        `SELECT public_id FROM Projetos WHERE ID_usuario = ?`,
        [userId]
      );
      return result

    } catch (error) {
      throw error;
    }
  }

    static async pegarIdsReaisPeloUser(userId){
    try {
      const [result] = await db.execute(
        `SELECT ID FROM Projetos WHERE ID_usuario = ?`,
        [userId]
      );
      return result

    } catch (error) {
      throw error;
    }
  }

  static async deleteById(projetoId) {
    const connection = await db.getConnection();

    try {
      await connection.beginTransaction();

      const [result] = await connection.execute(
        `DELETE FROM Projetos WHERE ID = ?`,
        [projetoId]
      );

      await connection.commit();
      return result.affectedRows > 0;

    } catch (error) {
      await connection.rollback();
      throw error;
    } finally {
      connection.release();
    }
  }
}

export default ProjetoRepository;